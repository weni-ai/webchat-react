import DOMPurify from 'dompurify';

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: false,
    attributeNameCheck: false,
    allowCustomizedBuiltInElements: false,
  },
};

export function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty ?? '', SANITIZE_CONFIG);
}

export default sanitizeHtml;
