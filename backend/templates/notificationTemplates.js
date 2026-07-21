/**
 * Centralized, Versioned Notification Templates Repository.
 * Employs immutable template IDs (v1, v2) and dynamic schema verification guards
 * to prevent controller HTML sprawl and permanent formatting crashes in worker threads.
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Concrete template renderers representing immutable schema version checkpoints
const TEMPLATE_VERSIONS = {
  PASSWORD_RESET: {
    v1: {
      requiredKeys: ['name', 'resetLink'],
      renderEmail(payload) {
        return {
          subject: 'Reset Your Password - Nearby Locator',
          html: `<p>Hello ${payload.name},</p><p>You requested a password reset. Please click <a href="${payload.resetLink}">here</a> to complete the reset process.</p><p>This link is valid for 1 hour.</p>`,
          text: `Hello ${payload.name},\n\nYou requested a password reset. Please use the following link to reset your password: ${payload.resetLink}\n\nThis link is valid for 1 hour.`
        };
      },
      renderSMS(payload) {
        return `Nearby Locator: Hello ${payload.name}, reset your password using: ${payload.resetLink}`;
      }
    },
    v2: {
      requiredKeys: ['name', 'resetLink', 'supportEmail'],
      renderEmail(payload) {
        return {
          subject: 'Reset Your Password - Action Required',
          html: `<p>Hello ${payload.name},</p><p>Reset your password <a href="${payload.resetLink}">here</a>.</p><p>If you did not request this, contact support at ${payload.supportEmail}.</p>`,
          text: `Hello ${payload.name},\n\nReset your password here: ${payload.resetLink}\n\nIf you did not request this, contact support at: ${payload.supportEmail}`
        };
      },
      renderSMS(payload) {
        return `Nearby Locator: Reset your password: ${payload.resetLink} Support: ${payload.supportEmail}`;
      }
    }
  },
  GEO_ALERT: {
    v1: {
      requiredKeys: ['spotName', 'distanceMeters'],
      renderEmail(payload) {
        return {
          subject: 'New Nearby Spot Discovered!',
          html: `<p>A new location "<strong>${payload.spotName}</strong>" is only ${payload.distanceMeters} meters away from you!</p>`,
          text: `New Nearby Spot Discovered! "${payload.spotName}" is only ${payload.distanceMeters} meters away from you!`
        };
      },
      renderSMS(payload) {
        return `Nearby Locator: A new spot "${payload.spotName}" is only ${payload.distanceMeters}m away from you!`;
      }
    }
  },
  MARKETING_DEAL: {
    v1: {
      requiredKeys: ['promoCode', 'discountPercentage'],
      renderEmail(payload) {
        return {
          subject: 'Exclusive Deal - Save Big!',
          html: `<p>Use code <strong>${payload.promoCode}</strong> to save ${payload.discountPercentage}% on your next subscription renewal!</p>`,
          text: `Use code ${payload.promoCode} to save ${payload.discountPercentage}% on your next subscription renewal!`
        };
      },
      renderSMS(payload) {
        return `Nearby Locator: Use code ${payload.promoCode} to save ${payload.discountPercentage}% today!`;
      }
    }
  }
};

export const NotificationTemplates = {
  /**
   * Render and compile template content safely.
   * Performs schema validation up-front, throwing a permanent ValidationError
   * if keys are missing to ensure transient retry loops are not wasted.
   */
  render(templateId, version = 'v1', channel = 'email', payload = {}) {
    const template = TEMPLATE_VERSIONS[templateId];
    if (!template) {
      throw new ValidationError(`Template ID "${templateId}" is not registered in central templates repository.`);
    }

    const templateRev = template[version];
    if (!templateRev) {
      throw new ValidationError(`Template Revision "${version}" is not defined for Template ID "${templateId}".`);
    }

    // 1. Enforce strict schema validation
    for (const key of templateRev.requiredKeys) {
      if (payload[key] === undefined || payload[key] === null) {
        throw new ValidationError(`Missing required template payload variable: "${key}" for ${templateId} (${version})`);
      }
    }

    // 2. Render targeted channel format
    if (channel === 'email') {
      return templateRev.renderEmail(payload);
    } else if (channel === 'sms' || channel === 'push') {
      const textContent = templateRev.renderSMS(payload);
      return { text: textContent };
    } else {
      throw new ValidationError(`Unsupported channel: "${channel}" inside template engine rendering.`);
    }
  }
};
