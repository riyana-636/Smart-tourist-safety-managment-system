const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, verifiedUserAuth } = require('../middleware/auth');
const User = require('../models/User');
const SafetyAlert = require('../models/SafetyAlert');
const SafeRoute = require('../models/SafeRoute');
const TravelGroup = require('../models/TravelGroup');

const router = express.Router();

// @route   GET /api/safety/alerts
// @desc    Get safety alerts for user's location
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;
    
    let query = {
      isActive: true,
      expiresAt: { $gt: new Date() }
    };

    // If location provided, get alerts within radius
    if (latitude && longitude) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    } else {
      // Get user's current location alerts
      const user = await User.findById(req.user.id);
      if (user.currentLocation && user.currentLocation.coordinates[0] !== 0) {
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: user.currentLocation.coordinates
            },
            $maxDistance: 50000 // 50km default
          }
        };
      }
    }

    const alerts = await SafetyAlert.find(query)
      .populate('reportedBy', 'firstName lastName')
      .sort({ severity: -1, createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: alerts.length,
      alerts
    });

  } catch (error) {
    console.error('Get safety alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching safety alerts'
    });
  }
});

// @route   POST /api/safety/alerts
// @desc    Report a safety alert
// @access  Private (Verified users only)
router.post('/alerts', verifiedUserAuth, [
  body('type')
    .isIn(['crime', 'natural_disaster', 'health_emergency', 'traffic', 'protest', 'terrorism', 'other'])
    .withMessage('Invalid alert type'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude')
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

    const {
      type,
      title,
      description,
      severity,
      latitude,
      longitude,
      address
    } = req.body;

    const alert = new SafetyAlert({
      type,
      title,
      description,
      severity,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      address,
      reportedBy: req.user.id,
      verificationStatus: 'pending'
    });

    await alert.save();

    // Populate reporter info
    await alert.populate('reportedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Safety alert reported successfully',
      alert
    });

  } catch (error) {
    console.error('Report safety alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reporting alert'
    });
  }
});

// @route   GET /api/safety/routes
// @desc    Get safe routes between two points
// @access  Private
router.get('/routes', auth, async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, mode = 'walking' } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        success: false,
        message: 'Start and end coordinates are required'
      });
    }

    // Find existing safe routes near the requested path
    const routes = await SafeRoute.find({
      mode,
      isActive: true,
      $or: [
        {
          'startPoint.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parseFloat(startLng), parseFloat(startLat)]
              },
              $maxDistance: 1000 // 1km radius
            }
          }
        },
        {
          'endPoint.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [parseFloat(endLng), parseFloat(endLat)]
              },
              $maxDistance: 1000
            }
          }
        }
      ]
    })
    .populate('createdBy', 'firstName lastName')
    .sort({ safetyRating: -1, createdAt: -1 })
    .limit(5);

    // Get nearby safety alerts for route planning
    const alerts = await SafetyAlert.find({
      isActive: true,
      severity: { $in: ['high', 'critical'] },
      location: {
        $geoWithin: {
          $centerSphere: [
            [(parseFloat(startLng) + parseFloat(endLng)) / 2, 
             (parseFloat(startLat) + parseFloat(endLat)) / 2],
            10 / 6371 // 10km radius in radians
          ]
        }
      }
    });

    res.json({
      success: true,
      routes,
      alerts,
      routeInfo: {
        start: { lat: parseFloat(startLat), lng: parseFloat(startLng) },
        end: { lat: parseFloat(endLat), lng: parseFloat(endLng) },
        mode
      }
    });

  } catch (error) {
    console.error('Get safe routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching routes'
    });
  }
});

// @route   POST /api/safety/routes
// @desc    Add a safe route
// @access  Private (Verified users only)
router.post('/routes', verifiedUserAuth, [
  body('name')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Route name must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('mode')
    .isIn(['walking', 'driving', 'cycling', 'public_transport'])
    .withMessage('Invalid transportation mode'),
  body('startPoint.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid start latitude'),
  body('startPoint.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid start longitude'),
  body('endPoint.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid end latitude'),
  body('endPoint.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid end longitude'),
  body('waypoints')
    .optional()
    .isArray()
    .withMessage('Waypoints must be an array')
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

    const {
      name,
      description,
      mode,
      startPoint,
      endPoint,
      waypoints = [],
      estimatedDuration,
      distance
    } = req.body;

    const route = new SafeRoute({
      name,
      description,
      mode,
      startPoint: {
        type: 'Point',
        coordinates: [startPoint.longitude, startPoint.latitude]
      },
      endPoint: {
        type: 'Point',
        coordinates: [endPoint.longitude, endPoint.latitude]
      },
      waypoints: waypoints.map(wp => ({
        type: 'Point',
        coordinates: [wp.longitude, wp.latitude]
      })),
      estimatedDuration,
      distance,
      createdBy: req.user.id
    });

    await route.save();
    await route.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Safe route added successfully',
      route
    });

  } catch (error) {
    console.error('Add safe route error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding route'
    });
  }
});

// @route   GET /api/safety/groups
// @desc    Get travel groups
// @access  Private
router.get('/groups', auth, async (req, res) => {
  try {
    const { destination, startDate, endDate } = req.query;
    
    let query = {
      isActive: true,
      isPublic: true,
      startDate: { $gte: new Date() }
    };

    if (destination) {
      query.destination = new RegExp(destination, 'i');
    }

    if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }

    if (endDate) {
      query.endDate = { $lte: new Date(endDate) };
    }

    const groups = await TravelGroup.find(query)
      .populate('leader', 'firstName lastName profile.avatar')
      .populate('members', 'firstName lastName profile.avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      count: groups.length,
      groups
    });

  } catch (error) {
    console.error('Get travel groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching travel groups'
    });
  }
});

// @route   POST /api/safety/groups
// @desc    Create a travel group
// @access  Private (Verified users only)
router.post('/groups', verifiedUserAuth, [
  body('name')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Group name must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('destination')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Destination must be between 2 and 100 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Invalid start date'),
  body('endDate')
    .isISO8601()
    .withMessage('Invalid end date'),
  body('maxMembers')
    .isInt({ min: 2, max: 50 })
    .withMessage('Max members must be between 2 and 50')
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

    const {
      name,
      description,
      destination,
      startDate,
      endDate,
      maxMembers,
      isPublic = true,
      requirements
    } = req.body;

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (new Date(startDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    const group = new TravelGroup({
      name,
      description,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxMembers,
      isPublic,
      requirements,
      leader: req.user.id,
      members: [req.user.id]
    });

    await group.save();
    await group.populate('leader', 'firstName lastName profile.avatar');
    await group.populate('members', 'firstName lastName profile.avatar');

    res.status(201).json({
      success: true,
      message: 'Travel group created successfully',
      group
    });

  } catch (error) {
    console.error('Create travel group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating group'
    });
  }
});

// @route   PUT /api/safety/location
// @desc    Update user's current location
// @access  Private
router.put('/location', auth, [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters')
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

    const { latitude, longitude, address } = req.body;

    const user = await User.findById(req.user.id);
    await user.updateLocation(longitude, latitude, address);

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: user.currentLocation
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating location'
    });
  }
});

module.exports = router;