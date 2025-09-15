// models/SafetyAlert.js
const mongoose = require('mongoose');

const safetyAlertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['crime', 'natural_disaster', 'health_emergency', 'traffic', 'protest', 'terrorism', 'other']
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Alert description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  severity: {
    type: String,
    required: [true, 'Severity level is required'],
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
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
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates format'
      }
    }
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'duplicate'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  affectedRadius: {
    type: Number, // in meters
    default: 1000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration based on severity
      const hours = {
        low: 24,
        medium: 48,
        high: 72,
        critical: 168 // 7 days
      };
      return new Date(Date.now() + (hours[this.severity] || 24) * 60 * 60 * 1000);
    }
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['helpful', 'confirmed', 'outdated', 'spam']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  media: [{
    type: String, // URLs to images/videos
    maxlength: [500, 'Media URL cannot exceed 500 characters']
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location queries
safetyAlertSchema.index({ location: '2dsphere' });
safetyAlertSchema.index({ type: 1, severity: 1 });
safetyAlertSchema.index({ expiresAt: 1 });
safetyAlertSchema.index({ reportedBy: 1 });

// Virtual for reaction counts
safetyAlertSchema.virtual('reactionCounts').get(function() {
  const counts = { helpful: 0, confirmed: 0, outdated: 0, spam: 0 };
  this.reactions.forEach(reaction => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

const SafetyAlert = mongoose.model('SafetyAlert', safetyAlertSchema);

// models/SafeRoute.js
const safeRouteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    maxlength: [100, 'Route name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  mode: {
    type: String,
    required: [true, 'Transportation mode is required'],
    enum: ['walking', 'driving', 'cycling', 'public_transport']
  },
  startPoint: {
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
  endPoint: {
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
  waypoints: [{
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number] // [longitude, latitude]
    },
    description: String
  }],
  distance: {
    type: Number, // in meters
    min: [0, 'Distance cannot be negative']
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [0, 'Duration cannot be negative']
  },
  safetyRating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'difficult'],
    default: 'moderate'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [300, 'Comment cannot exceed 300 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  timesUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial indexes
safeRouteSchema.index({ startPoint: '2dsphere' });
safeRouteSchema.index({ endPoint: '2dsphere' });
safeRouteSchema.index({ mode: 1, safetyRating: -1 });

// Virtual for average rating
safeRouteSchema.virtual('averageRating').get(function() {
  if (this.ratings.length === 0) return this.safetyRating;
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return (sum / this.ratings.length).toFixed(1);
});

const SafeRoute = mongoose.model('SafeRoute', safeRouteSchema);

// models/TravelGroup.js
const travelGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true,
    maxlength: [100, 'Destination cannot exceed 100 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(date) {
        return date >= new Date();
      },
      message: 'Start date cannot be in the past'
    }
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(date) {
        return date > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  maxMembers: {
    type: Number,
    required: [true, 'Maximum members is required'],
    min: [2, 'Group must allow at least 2 members'],
    max: [50, 'Group cannot exceed 50 members']
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'left', 'removed'],
      default: 'active'
    }
  }],
  pendingRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      maxlength: [200, 'Request message cannot exceed 200 characters']
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  requirements: {
    minAge: {
      type: Number,
      min: [0, 'Minimum age cannot be negative'],
      max: [100, 'Minimum age cannot exceed 100']
    },
    maxAge: {
      type: Number,
      min: [0, 'Maximum age cannot be negative'],
      max: [120, 'Maximum age cannot exceed 120']
    },
    gender: {
      type: String,
      enum: ['any', 'male', 'female', 'non-binary'],
      default: 'any'
    },
    experience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'any'],
      default: 'any'
    },
    languages: [{
      type: String,
      lowercase: true
    }]
  },
  activities: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  budget: {
    min: {
      type: Number,
      min: [0, 'Minimum budget cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum budget cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      maxlength: [3, 'Currency code cannot exceed 3 characters']
    }
  },
  meetingPoint: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },
    address: {
      type: String,
      maxlength: [200, 'Meeting point address cannot exceed 200 characters']
    },
    details: {
      type: String,
      maxlength: [300, 'Meeting point details cannot exceed 300 characters']
    }
  },
  chat: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isSystemMessage: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['planning', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'planning'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for location-based queries
travelGroupSchema.index({ 'meetingPoint.location': '2dsphere' });
travelGroupSchema.index({ destination: 1, startDate: 1 });
travelGroupSchema.index({ leader: 1 });
travelGroupSchema.index({ isPublic: 1, isActive: 1 });

// Virtual for current member count
travelGroupSchema.virtual('currentMembers').get(function() {
  return this.members.filter(member => member.status === 'active').length;
});

// Virtual for available spots
travelGroupSchema.virtual('availableSpots').get(function() {
  return this.maxMembers - this.currentMembers;
});

// Virtual for is full
travelGroupSchema.virtual('isFull').get(function() {
  return this.availableSpots <= 0;
});

// Method to add member
travelGroupSchema.methods.addMember = function(userId) {
  if (this.isFull) {
    throw new Error('Group is full');
  }
  
  // Check if user is already a member
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (existingMember.status === 'left' || existingMember.status === 'removed') {
      existingMember.status = 'active';
      existingMember.joinedAt = new Date();
    }
    return this;
  }
  
  this.members.push({
    user: userId,
    status: 'active',
    joinedAt: new Date()
  });
  
  // Add system message
  this.chat.push({
    message: `A new member has joined the group`,
    isSystemMessage: true
  });
  
  return this.save();
};

// Method to remove member
travelGroupSchema.methods.removeMember = function(userId, reason = 'left') {
  const member = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.status = reason;
    
    // Add system message
    this.chat.push({
      message: `A member has ${reason} the group`,
      isSystemMessage: true
    });
  }
  
  return this.save();
};

const TravelGroup = mongoose.model('TravelGroup', travelGroupSchema);

module.exports = {
  SafetyAlert,
  SafeRoute,
  TravelGroup
};