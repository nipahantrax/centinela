// Official emergency contacts. A number is only shown as dialable when its
// status is "verificado". COE departmental numbers stay "pendiente" until an
// authoritative source confirms them; never present a pending number as official.
export type ContactStatus = 'verificado' | 'pendiente';
export interface EmergencyContact {
  name: string;
  scope: string;
  number: string | null;
  status: ContactStatus;
  note?: string;
}

export const NATIONAL_CONTACTS: EmergencyContact[] = [
  { name: 'Bomberos', scope: 'Nacional', number: '119', status: 'verificado' },
  { name: 'Policía', scope: 'Nacional', number: '110', status: 'verificado' },
];

// COE departamental. Numbers must be confirmed with each department's official
// COE before they can be marked "verificado" and offered as dial links.
export const COE_CONTACTS: EmergencyContact[] = [
  { name: 'COE Chuquisaca', scope: 'Chuquisaca', number: null, status: 'pendiente' },
  { name: 'COE La Paz', scope: 'La Paz', number: null, status: 'pendiente' },
  { name: 'COE Cochabamba', scope: 'Cochabamba', number: '4258030', status: 'pendiente', note: 'Número aportado por el equipo; pendiente de confirmación oficial.' },
  { name: 'COE Oruro', scope: 'Oruro', number: null, status: 'pendiente' },
  { name: 'COE Potosí', scope: 'Potosí', number: null, status: 'pendiente' },
  { name: 'COE Tarija', scope: 'Tarija', number: null, status: 'pendiente' },
  { name: 'COE Santa Cruz', scope: 'Santa Cruz', number: null, status: 'pendiente' },
  { name: 'COE Beni', scope: 'Beni', number: null, status: 'pendiente' },
  { name: 'COE Pando', scope: 'Pando', number: null, status: 'pendiente' },
];

export function coeForDepartment(department: string): EmergencyContact | undefined {
  return COE_CONTACTS.find(c => c.scope === department);
}
