import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * AccountValidation: Joi input validation middleware schemas for Account & User Management.
 */

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map((d) => d.message).join('; ');
    return next(new ValidationError(`Input validation error: ${details}`));
  }
  req[source] = value;
  return next();
};

export const validateUpdateProfile = validate(
  Joi.object({
    name: Joi.string().trim().max(150).optional(),
    first_name: Joi.string().trim().max(100).allow('', null).optional(),
    last_name: Joi.string().trim().max(100).allow('', null).optional(),
    display_name: Joi.string().trim().max(150).allow('', null).optional(),
    username: Joi.string().trim().pattern(/^[a-zA-Z0-9_]{3,30}$/).allow('', null).optional(),
    bio: Joi.string().max(1000).allow('', null).optional(),
    phone: Joi.string().max(30).allow('', null).optional(),
    address: Joi.string().max(255).allow('', null).optional(),
    country: Joi.string().max(100).allow('', null).optional(),
    state: Joi.string().max(100).allow('', null).optional(),
    city: Joi.string().max(100).allow('', null).optional(),
    postal_code: Joi.string().max(20).allow('', null).optional(),
    timezone: Joi.string().max(50).optional(),
    language: Joi.string().max(10).optional()
  })
);

export const validateChangeEmail = validate(
  Joi.object({
    newEmail: Joi.string().email().required()
  })
);

export const validateVerifyEmailChange = validate(
  Joi.object({
    newEmail: Joi.string().email().required(),
    otpCode: Joi.string().length(6).required()
  })
);

export const validateChangePassword = validate(
  Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
  })
);

export const validatePreferences = validate(
  Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    language: Joi.string().max(10).optional(),
    timezone: Joi.string().max(50).optional(),
    search_preferences: Joi.object().optional(),
    ai_preferences: Joi.object().optional()
  })
);

export const validatePrivacy = validate(
  Joi.object({
    profile_visibility: Joi.string().valid('public', 'private', 'contacts').optional(),
    recommendation_preferences: Joi.object().optional(),
    marketing_preferences: Joi.object().optional()
  })
);

export const validateNotifications = validate(
  Joi.object({
    email_notifications: Joi.object().optional(),
    in_app_notifications: Joi.object().optional(),
    security_alerts: Joi.boolean().optional()
  })
);

export const validateAdminUserSearch = validate(
  Joi.object({
    search: Joi.string().max(100).optional(),
    status: Joi.string().valid('ACTIVE', 'PENDING_VERIFICATION', 'DISABLED', 'BANNED', 'LOCKED', 'SOFT_DELETED').optional(),
    roleId: Joi.string().uuid().optional(),
    provider: Joi.string().optional(),
    verified: Joi.boolean().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
    sort: Joi.string().valid('created_at', 'email', 'name', 'status', 'last_login_at').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    export: Joi.string().valid('csv').optional()
  }),
  'query'
);
