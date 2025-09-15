const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, verifiedUserAuth } = require('../middleware/auth');
const User = require('../models/User');
const EmergencyContact = require('../models/EmergencyContact');
const EmergencyReport = require('../models/EmergencyReport');
const { sendEmergencyAlert, sendSMS } = require('../utils/emergencyServices');

const router = express.Router();

// @route   POST /api/emergency/alert
// @desc    Send emergency alert
// @access  Private
router.post('/alert', auth, [
  body('type')
    .isIn(['medical', 'crime', 'accident', 'natural_disaster', 'general'])
    .withMessage('Invalid emergency type'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, severity, message, latitude, longitude } = req.body;
    const user = await User.findById(req.user.id).populate('emergencyContact');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create emergency report
    const emergencyReport = new EmergencyReport({
      user: req.user.id,
      type,
      severity,
      message,
      location: latitude && longitude ? {
        type: 'Point',
        coordinates: [longitude, latitude]
      } : user.currentLocation,
      status: 'active'
    });

    await emergencyReport.save();

    // Prepare emergency data
    const emergencyData = {
      reportId: emergencyReport._id,
      userId: user._id,
      userName: user.fullName,
      userPhone: user.phone,
      type,
      severity,
      message: message || `${type} emergency reported`,
      location: emergencyReport.location,
      timestamp: new Date(),
      emergencyContact: user.emergencyContact
    };

    try {
      // Send alert to emergency services
      await sendEmergencyAlert(emergencyData);

      // Send SMS to emergency contact if provided
      if (user.emergencyContact && user.emergencyContact.phone) {
        const smsMessage = `EMERGENCY ALERT: ${user.fullName} has reported a ${type} emergency. ${message || ''} Location: ${emergencyData.location.coordinates.join(', ')}. Time: ${new Date().toLocaleString()}`;
        
        await sendSMS(user.emergencyContact.phone, smsMessage);
      }

      // Update emergency report status
      emergencyReport.status = 'dispatched';
      emergencyReport.dispatchedAt = new Date();
      await emergencyReport.save();

      res.status(201).json({
        success: true,
        message: 'Emergency alert sent successfully',
        emergencyId: emergencyReport._id,
        estimatedResponse: '5-15 minutes'
      });

    } catch (alertError) {
      console.error('Emergency alert sending failed:', alertError);
      
      // Still save the report even if external services fail
      emergencyReport.status = 'failed';
      emergencyReport.errorMessage = alertError.message;
      await emergencyReport.save();

      res.status(500).json({
        success: false,
        message: 'Emergency recorded but alert sending failed. Please call local emergency services directly.',
        emergencyId: emergencyReport._id
      });
    }

  } catch (error) {
    console.error('Emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during emergency alert'
    });
  }
});

// @route   GET /api/emergency/contacts
// @desc    Get emergency contacts for user's location
// @access  Private
router.get('/contacts', auth, async (req, res) => {
  try {
    const { latitude, longitude, country } = req.query;
    const user = await User.findById(req.user.id);

    let searchCountry = country;
    if (!searchCountry) {
      searchCountry = user.country;
    }

    // Get emergency contacts for the country/location
    let contacts = await EmergencyContact.find({
      country: searchCountry,
      isActive: true
    }).sort({ priority: 1, name: 1 });

    // If location provided, get location-specific contacts
    if (latitude && longitude) {
      const locationContacts = await EmergencyContact.find({
        isActive: true,
        serviceArea: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: 50000 // 50km radius
          }
        }
      }).sort({ priority: 1 });

      // Merge and deduplicate contacts
      const allContacts = [...locationContacts, ...contacts];
      const uniqueContacts = allContacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.phone === contact.phone && c.type === contact.type)
      );

      contacts = uniqueContacts.slice(0, 10); // Limit to 10 most relevant contacts
    }

    res.json({
      success: true,
      country: searchCountry,
      contacts: contacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        type: contact.type,
        phone: contact.phone,
        description: contact.description,
        availability: contact.availability
      }))
    });

  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching emergency contacts'
    });
  }
});

// @route   GET /api/emergency/services/:country
// @desc    Get emergency services for specific country
// @access  Private
router.get('/services/:country', auth, async (req, res) => {
  try {
    const { country } = req.params;
    
    // Emergency service numbers by country
    const emergencyServices = {
      US: {
        police: '911',
        fire: '911',
        medical: '911',
        general: '911'
      },
      UK: {
        police: '999',
        fire: '999',
        medical: '999',
        general: '999',
        non_emergency_police: '101',
        non_emergency_medical: '111'
      },
      CA: {
        police: '911',
        fire: '911',
        medical: '911',
        general: '911'
      },
      AU: {
        police: '000',
        fire: '000',
        medical: '000',
        general: '000'
      },
      DE: {
        police: '110',
        fire: '112',
        medical: '112',
        general: '112'
      },
      FR: {
        police: '17',
        fire: '18',
        medical: '15',
        general: '112'
      },
      JP: {
        police: '110',
        fire: '119',
        medical: '119'
      },
      IN: {
        police: '100',
        fire: '101',
        medical: '108',
        general: '112'
      },
      BR: {
        police: '190',
        fire: '193',
        medical: '192',
        general: '911'
      },
      MX: {
        police: '911',
        fire: '911',
        medical: '911',
        general: '911'
      }
    };

    const services = emergencyServices[country.toUpperCase()];
    
    if (!services) {
      return res.status(404).json({
        success: false,
        message: 'Emergency services not found for this country'
      });
    }

    res.json({
      success: true,
      country: country.toUpperCase(),
      services,
      instructions: {
        general: 'Stay calm and speak clearly when calling emergency services',
        information: 'Be ready to provide your location, nature of emergency, and contact information',
        language: 'If language is a barrier, ask for an interpreter'
      }
    });

  } catch (error) {
    console.error('Get emergency services error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching emergency services'
    });
  }
});

// @route   POST /api/emergency/check-in
// @desc    Safety check-in
// @access  Private
router.post('/check-in', auth, [
  body('status')
    .isIn(['safe', 'concern', 'help_needed'])
    .withMessage('Invalid status'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Message cannot exceed 300 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status, message, latitude, longitude } = req.body;
    const user = await User.findById(req.user.id);

    // Update user's current location if provided
    if (latitude && longitude) {
      await user.updateLocation(longitude, latitude);
    }

    // Create check-in record
    const checkIn = {
      status,
      message,
      location: user.currentLocation,
      timestamp: new Date()
    };

    // If status is concerning, create emergency report
    if (status === 'help_needed') {
      const emergencyReport = new EmergencyReport({
        user: req.user.id,
        type: 'general',
        severity: 'medium',
        message: message || 'User requested help during check-in',
        location: user.currentLocation,
        status: 'active'
      });

      await emergencyReport.save();

      // Notify emergency contact
      if (user.emergencyContact && user.emergencyContact.phone) {
        const smsMessage = `SAFETY CHECK-IN ALERT: ${user.fullName} has requested help. Message: ${message || 'No additional message'}. Location: ${user.currentLocation.coordinates.join(', ')}. Time: ${new Date().toLocaleString()}`;
        
        try {
          await sendSMS(user.emergencyContact.phone, smsMessage);
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
        }
      }

      return res.json({
        success: true,
        message: 'Emergency check-in recorded. Help is being arranged.',
        emergencyId: emergencyReport._id,
        checkIn
      });
    }

    res.json({
      success: true,
      message: 'Safety check-in recorded successfully',
      checkIn
    });

  } catch (error) {
    console.error('Safety check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during check-in'
    });
  }
});

// @route   GET /api/emergency/reports
// @desc    Get user's emergency reports
// @access  Private
router.get('/reports', auth, async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    
    let query = { user: req.user.id };
    if (status) {
      query.status = status;
    }

    const reports = await EmergencyReport.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('respondedBy', 'firstName lastName');

    const total = await EmergencyReport.countDocuments(query);

    res.json({
      success: true,
      reports,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get emergency reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports'
    });
  }
});

// @route   PUT /api/emergency/reports/:id
// @desc    Update emergency report status
// @access  Private
router.put('/reports/:id', auth, [
  body('status')
    .optional()
    .isIn(['active', 'dispatched', 'responded', 'resolved', 'cancelled', 'false_alarm'])
    .withMessage('Invalid status'),
  body('resolution')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Resolution cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, resolution } = req.body;

    const report = await EmergencyReport.findOne({
      _id: id,
      user: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Emergency report not found'
      });
    }

    // Update report
    if (status) report.status = status;
    if (resolution) report.resolution = resolution;

    if (status === 'resolved' || status === 'cancelled' || status === 'false_alarm') {
      report.resolvedAt = new Date();
    }

    await report.save();

    res.json({
      success: true,
      message: 'Emergency report updated successfully',
      report
    });

  } catch (error) {
    console.error('Update emergency report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating report'
    });
  }
});

module.exports = router;