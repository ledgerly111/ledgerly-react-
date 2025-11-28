export const FEATURE_PERMISSIONS = [
  {
    key: 'sales.create',
    label: 'Create Sales',
    description: 'Record new sales and quick sale transactions.',
  },
  {
    key: 'sales.editAny',
    label: 'Edit Any Sale',
    description: 'Modify sales created by any team member.',
  },
  {
    key: 'sales.editOwn',
    label: 'Edit Own Sales',
    description: 'Modify sales created by the employee.',
  },
  {
    key: 'sales.deleteAny',
    label: 'Delete Any Sale',
    description: 'Delete sales created by any team member.',
  },
  {
    key: 'sales.deleteOwn',
    label: 'Delete Own Sales',
    description: 'Delete sales created by the employee.',
  },
  {
    key: 'sales.generateInvoice',
    label: 'Generate Invoices',
    description: 'Generate invoices and PDFs from sales records.',
  },
  {
    key: 'quickSale.use',
    label: 'Use Quick Sale',
    description: 'Access the guided quick sale experience.',
  },
  {
    key: 'customers.create',
    label: 'Add Customers',
    description: 'Create new customer profiles.',
  },
  {
    key: 'customers.edit',
    label: 'Edit Customers',
    description: 'Update customer profiles and account details.',
  },
  {
    key: 'customers.delete',
    label: 'Delete Customers',
    description: 'Remove customer profiles from the system.',
  },
  {
    key: 'products.manage',
    label: 'Manage Products',
    description: 'Create, edit, and archive products in the catalog.',
  },
  {
    key: 'expenses.create',
    label: 'Submit Expenses',
    description: 'Record new expense entries.',
  },
  {
    key: 'expenses.edit',
    label: 'Edit Expenses',
    description: 'Modify existing expense entries.',
  },
  {
    key: 'expenses.delete',
    label: 'Delete Expenses',
    description: 'Remove expense entries.',
  },
  {
    key: 'reports.view',
    label: 'Financial Reports',
    description: 'Access financial reporting dashboards and exports.',
  },
  {
    key: 'accounting.view',
    label: 'Accounting Suite',
    description: 'Open the journal, ledger, trial balance, and balance sheet.',
  },
  {
    key: 'invoices.manage',
    label: 'Manage Invoices',
    description: 'Mark invoices as paid, delete records, and control invoice lifecycle.',
  },
  {
    key: 'purchasing.manage',
    label: 'Manage Purchasing',
    description: 'Create, edit, and receive purchase orders from suppliers.',
  },
  {
    key: 'team.manageMembers',
    label: 'Manage Employees',
    description: 'Add, update, and remove team members from the directory.',
  },
  {
    key: 'team.manageStructure',
    label: 'Manage Teams',
    description: 'Create and reorganize teams or branches.',
  },
  {
    key: 'team.viewAll',
    label: 'View All Teams',
    description: 'Access every team regardless of membership or supervision.',
  },
  {
    key: 'supervision.manage',
    label: 'Manage Supervision',
    description: 'Invite, approve, and end supervision relationships.',
  },
  {
    key: 'tasks.manage',
    label: 'Manage Tasks',
    description: 'Create, assign, and archive collaborative tasks.',
  },
  {
    key: 'tasks.participate',
    label: 'Participate in Tasks',
    description: 'Join tasks and report on progress.',
  },
  {
    key: 'inbox.broadcast',
    label: 'Broadcast Announcements',
    description: 'Send announcements and alerts to teams.',
  },
  {
    key: 'ai.access',
    label: 'Use Benka AI',
    description: 'Open the AI assistant and request insights.',
  },
  {
    key: 'settings.manage',
    label: 'Manage Company Settings',
    description: 'Update organization preferences like branding and alerts.',
  },
  {
    key: 'settings.advanced',
    label: 'Advanced Settings',
    description: 'Perform exports and high-risk administration tasks.',
  },
];

export const FEATURE_PERMISSION_LOOKUP = FEATURE_PERMISSIONS.reduce((map, permission) => {
  map[permission.key] = permission;
  return map;
}, {});

const ALL_FEATURE_KEYS = FEATURE_PERMISSIONS.map((permission) => permission.key);

export const ROLE_DEFAULT_FEATURE_MAP = {
  admin: ALL_FEATURE_KEYS,
  manager: ALL_FEATURE_KEYS,
  worker: [
    'sales.create',
    'sales.editOwn',
    'sales.deleteOwn',
    'sales.generateInvoice',
    'quickSale.use',
    'customers.create',
    'customers.edit',
    'tasks.participate',
    'ai.access',
  ],
};

export function getRoleDefaultFeatures(role) {
  const normalizedRole = String(role ?? 'worker').toLowerCase();
  const defaults = ROLE_DEFAULT_FEATURE_MAP[normalizedRole] ?? ROLE_DEFAULT_FEATURE_MAP.worker;
  return new Set(defaults);
}

export function computeEffectivePermissions(role, overrides) {
  const effective = getRoleDefaultFeatures(role);
  if (overrides) {
    const revoked = Array.isArray(overrides.revokedPermissions) ? overrides.revokedPermissions : [];
    revoked.forEach((permission) => effective.delete(permission));
    const granted = Array.isArray(overrides.grantedPermissions) ? overrides.grantedPermissions : [];
    granted.forEach((permission) => effective.add(permission));
  }
  return effective;
}
