import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { logger } from '../utils/logger.js';

const templateCache = new Map();

export const EmailTemplateEngine = {
  /**
   * Loads and compiles a Handlebars template.
   * @param {string} templateName - Name of template file (without .hbs extension)
   * @returns {Function} Compiled Handlebars template function
   */
  getTemplate(templateName) {
    if (templateCache.has(templateName)) {
      return templateCache.get(templateName);
    }

    const templatePath = path.resolve(process.cwd(), 'templates', 'email', `${templateName}.hbs`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template '${templateName}.hbs' not found at ${templatePath}`);
    }

    const source = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(source);
    templateCache.set(templateName, compiled);
    return compiled;
  },

  /**
   * Renders a body template embedded inside the base HTML layout template.
   * @param {string} templateName - Name of content template (e.g. 'test')
   * @param {Object} data - Content variables
   * @returns {string} Rendered HTML string
   */
  render(templateName, data = {}) {
    const brandingTokens = {
      companyName: process.env.COMPANY_NAME || 'Nearby Locator',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@nearby.com',
      logoUrl: process.env.LOGO_URL || '',
      year: new Date().getFullYear(),
      ...data
    };

    let contentHtml = '';
    try {
      const contentTemplate = this.getTemplate(templateName);
      contentHtml = contentTemplate(brandingTokens);
    } catch (err) {
      logger.error(`[EmailTemplateEngine] Failed to render content template '${templateName}':`, err);
      contentHtml = `<p>${data.message || 'Notification content'}</p>`;
    }

    try {
      const baseTemplate = this.getTemplate('base');
      return baseTemplate({
        ...brandingTokens,
        subject: data.subject || 'Notification',
        body: contentHtml
      });
    } catch (err) {
      logger.error('[EmailTemplateEngine] Failed to render base template, returning inner HTML fallback:', err);
      return contentHtml;
    }
  },

  /**
   * Clears the in-memory template cache (useful for development/tests).
   */
  clearCache() {
    templateCache.clear();
  }
};
