// utils/sendEmail.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to Travault - Verify Your Email',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Travault</h1>
          <p style="color: white; margin: 10px 0;">Your Safety, Our Priority</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${data.name},</h2>
          <p>Welcome to Travault! We're excited to have you join our community of safe travelers.</p>
          <p>To get started, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If you didn't create this account, you can safely ignore this email.</p>
          <p>Best regards,<br>The Travault Team</p>
        </div>
      </div>
    `
  },
  passwordReset: {
    subject: 'Travault - Password Reset Request',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2>Hi ${data.name},</h2>
          <p>You requested to reset your password for your Travault account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 10 minutes for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The Travault Team</p>
        </div>
      </div>
    `
  },
  emergencyAlert: {
    subject: 'EMERGENCY ALERT - Immediate Action Required',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #dc3545;">
        <div style="background: #dc3545; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚨 EMERGENCY ALERT</h1>
        </div>
        <div style="padding: 30px; background: #fff3cd;">
          <h2>Emergency Report Details</h2>
          <p><strong>User:</strong> ${data.userName}</p>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Severity:</strong> ${data.severity}</p>
          <p><strong>Message:</strong> ${data.message}</p>
          <p><strong>Location:</strong> ${data.location.coordinates.join(', ')}</p>
          <p><strong>Time:</strong> ${data.timestamp}</p>
          <p><strong>Contact:</strong> ${data.userPhone}</p>
          ${data.emergencyContact ? `<p><strong>Emergency Contact:</strong> ${data.emergencyContact.name} - ${data.emergencyContact.phone}</p>` : ''}
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>This is an automated emergency alert. Please respond immediately.</strong>
          </div>
        </div>
      </div>
    `
  }
};

const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    let html = options.html;
    
    // Use template if specified
    if (options.template && emailTemplates[options.template]) {
      const template = emailTemplates[options.template];
      html = template.html(options.data || {});
      if (!options.subject) {
        options.subject = template.subject;
      }
    }

    const mailOptions = {
      from: `"Travault" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: html || options.text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
    
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

module.exports = sendEmail;

// utils/emergencyServices.js
const sendEmail = require('./sendemail');

const sendEmergencyAlert = async (emergencyData) => {
  try {
    // Send email to emergency services
    const emergencyEmail = process.env.EMERGENCY_SERVICES_EMAIL || 'emergency@travault.com';
    
    await sendEmail({
      to: emergencyEmail,
      template: 'emergencyAlert',
      data: emergencyData
    });

    // Log emergency for audit
    console.log('Emergency alert sent:', {
      reportId: emergencyData.reportId,
      userId: emergencyData.userId,
      type: emergencyData.type,
      severity: emergencyData.severity,
      timestamp: emergencyData.timestamp
    });

    return true;
  } catch (error) {
    console.error('Emergency alert sending failed:', error);
    throw error;
  }
};

const sendSMS = async (phoneNumber, message) => {
  try {
    // In a real implementation, you would integrate with SMS services like:
    // - Twilio
    // - AWS SNS
    // - Vonage (Nexmo)
    // - MessageBird
    
    // For demo purposes, we'll just log the SMS
    console.log('SMS would be sent:', {
      to: phoneNumber,
      message: message,
      timestamp: new Date()
    });

    // Uncomment and configure for real SMS integration:
    /*
    // Example with Twilio:
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: phoneNumber
    });
    
    return result;
    */

    return { success: true, messageId: 'demo_' + Date.now() };
    
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw error;
  }
};

const getEmergencyContacts = async (country, latitude, longitude) => {
  // This would integrate with emergency services APIs
  // For now, return mock data
  const emergencyContacts = {
    US: [
      { name: 'Emergency Services', phone: '911', type: 'general' },
      { name: 'Police Department', phone: '911', type: 'police' },
      { name: 'Fire Department', phone: '911', type: 'fire' },
      { name: 'Medical Emergency', phone: '911', type: 'medical' }
    ],
    UK: [
      { name: 'Emergency Services', phone: '999', type: 'general' },
      { name: 'Police', phone: '999', type: 'police' },
      { name: 'Fire Brigade', phone: '999', type: 'fire' },
      { name: 'Ambulance', phone: '999', type: 'medical' }
    ]
    // Add more countries as needed
  };

  return emergencyContacts[country] || [];
};

module.exports = {
  sendEmergencyAlert,
  sendSMS,
  getEmergencyContacts
};

// models/EmergencyContact.js
const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Contact type is required'],
    enum: ['police', 'fire', 'medical', 'coast_guard', 'mountain_rescue', 'general', 'embassy', 'tourist_police']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    uppercase: true
  },
  region: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  serviceArea: {
    type: {
      type: String,
      enum: ['Point', 'Polygon'],
      default: 'Point'
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  description: {
    type: String,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  availability: {
    type: String,
    enum: ['24/7', 'business_hours', 'emergency_only'],
    default: '24/7'
  },
  languages: [{
    type: String,
    lowercase: true
  }],
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastVerified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for geospatial queries
emergencyContactSchema.index({ serviceArea: '2dsphere' });
emergencyContactSchema.index({ country: 1, type: 1 });

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);

// models/EmergencyReport.js
const emergencyReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Emergency type is required'],
    enum: ['medical', 'crime', 'accident', 'natural_disaster', 'general']
  },
  severity: {
    type: String,
    required: [true, 'Severity is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    type: String,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: ['active', 'dispatched', 'responded', 'resolved', 'cancelled', 'false_alarm', 'failed'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  respondedAt: Date,
  dispatchedAt: Date,
  resolvedAt: Date,
  resolution: {
    type: String,
    maxlength: [500, 'Resolution cannot exceed 500 characters']
  },
  estimatedResponseTime: {
    type: Number // in minutes
  },
  actualResponseTime: {
    type: Number // in minutes
  },
  errorMessage: {
    type: String,
    maxlength: [200, 'Error message cannot exceed 200 characters']
  },
  externalReportId: {
    type: String // ID from external emergency services
  },
  media: [{
    type: String, // URLs to emergency photos/videos
    maxlength: [500, 'Media URL cannot exceed 500 characters']
  }],
  updates: [{
    message: {
      type: String,
      required: true,
      maxlength: [300, 'Update message cannot exceed 300 characters']
    },
    status: {
      type: String,
      enum: ['info', 'warning', 'success', 'error']
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for location and time-based queries
emergencyReportSchema.index({ location: '2dsphere' });
emergencyReportSchema.index({ user: 1, createdAt: -1 });
emergencyReportSchema.index({ status: 1, severity: -1 });

// Virtual for response time calculation
emergencyReportSchema.virtual('responseTimeMinutes').get(function() {
  if (!this.respondedAt) return null;
  return Math.round((this.respondedAt - this.createdAt) / (1000 * 60));
});

// Method to add update
emergencyReportSchema.methods.addUpdate = function(message, status = 'info', updatedBy = null) {
  this.updates.push({
    message,
    status,
    updatedBy,
    timestamp: new Date()
  });
  return this.save();
};

const EmergencyReport = mongoose.model('EmergencyReport', emergencyReportSchema);

// utils/socketManager.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travault_secret_key');
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.userEmail = user.email;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user to their personal room
    socket.join(socket.userId);

    // Handle location updates
    socket.on('location_update', async (data) => {
      try {
        const { latitude, longitude, address } = data;
        const user = await User.findById(socket.userId);
        
        if (user) {
          await user.updateLocation(longitude, latitude, address);
          
          // Broadcast location update to user's emergency contacts or travel groups
          socket.broadcast.to(`user_${socket.userId}_contacts`).emit('contact_location_update', {
            userId: socket.userId,
            location: { latitude, longitude, address },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // Handle emergency alerts
    socket.on('emergency_alert', (data) => {
      // Broadcast to emergency responders in the area
      socket.broadcast.to('emergency_responders').emit('new_emergency', {
        userId: socket.userId,
        ...data,
        timestamp: new Date()
      });
    });

    // Handle travel group chat
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    socket.on('group_message', (data) => {
      socket.broadcast.to(`group_${data.groupId}`).emit('new_group_message', {
        userId: socket.userId,
        message: data.message,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Send real-time notification to user
const sendNotificationToUser = (userId, type, data) => {
  if (io) {
    io.to(userId).emit('notification', {
      type,
      data,
      timestamp: new Date()
    });
  }
};

// Send emergency alert to nearby users
const sendEmergencyAlertToArea = (location, radius, alertData) => {
  if (io) {
    // In a real implementation, you would query users within the radius
    // and send alerts to their socket rooms
    io.emit('area_emergency_alert', {
      location,
      radius,
      alert: alertData,
      timestamp: new Date()
    });
  }
};

module.exports = {
  initializeSocket,
  getIO,
  sendNotificationToUser,
  sendEmergencyAlertToArea,
  EmergencyContact,
  EmergencyReport
};