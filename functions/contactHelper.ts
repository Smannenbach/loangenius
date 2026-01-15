/**
 * Contact helper functions
 */

export function getContactDisplayName(contact) {
  if (contact.contact_type === 'entity') {
    return contact.entity_name;
  }
  return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
}

export function formatContactPhone(phone) {
  if (!phone) return '';
  // Simple formatting: (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function maskSSN(ssn) {
  if (!ssn || ssn.length < 4) return ssn;
  return 'XXX-XX-' + ssn.slice(-4);
}

export function maskEIN(ein) {
  if (!ein || ein.length < 4) return ein;
  return 'XX-' + ein.slice(-7);
}