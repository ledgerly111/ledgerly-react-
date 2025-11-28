import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FEATURE_PERMISSIONS,
  FEATURE_PERMISSION_LOOKUP,
  computeEffectivePermissions,
  getRoleDefaultFeatures,
} from '../constants/featurePermissions.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import InvoiceModificationModal from '../components/InvoiceModificationModal.jsx';
import InvoiceTemplateSelector from '../components/InvoiceTemplateSelector.jsx';
import PurchaseOrderTemplateSelector from '../components/PurchaseOrderTemplateSelector.jsx';
import PurchaseOrderModificationModal from '../components/PurchaseOrderModificationModal.jsx';
import { getInvoiceTemplateById, defaultInvoiceTemplateId } from '../constants/invoiceTemplateDesigns.js';
import { getPurchaseOrderTemplateById, defaultPurchaseOrderTemplateId } from '../constants/purchaseOrderTemplateDesigns.js';
import { useAppActions, useAppState, getInvoiceTemplateEntry, getPurchaseOrderTemplateEntry } from '../context/AppContext.jsx';

function cloneTemplateConfig(config) {
  return JSON.parse(JSON.stringify(config ?? {}));
}

function normalizeEmployeesForAdmin(users, currentUserId) {
  return users
    .filter((user) => user && user.id != null && String(user.id) !== String(currentUserId))
    .map((user) => ({
      id: Number(user.id),
      name: user.name ?? user.username ?? `User ${user.id}`,
      role: user.role ?? 'worker',
      email: user.email ?? '',
    }));
}

function normalizeEmployeesForManager(supervisionLinks, users, managerId) {
  const allowedIds = supervisionLinks
    .filter((link) => link.status === 'active' && String(link.managerId) === String(managerId))
    .map((link) => Number(link.employeeId));
  const allowedSet = new Set(allowedIds);
  return users
    .filter((user) => user && user.id != null && allowedSet.has(Number(user.id)))
    .map((user) => ({
      id: Number(user.id),
      name: user.name ?? user.username ?? `User ${user.id}`,
      role: user.role ?? 'worker',
      email: user.email ?? '',
    }));
}

function filterEmployees(employees, query) {
  if (!query) {
    return employees;
  }
  const lower = query.toLowerCase();
  return employees.filter((employee) => (
    employee.name.toLowerCase().includes(lower)
    || employee.email.toLowerCase().includes(lower)
    || employee.role?.toLowerCase().includes(lower)
  ));
}

function filterPermissions(catalog, query) {
  if (!query) {
    return catalog;
  }
  const lower = query.toLowerCase();
  return catalog.filter((permission) => (
    permission.label.toLowerCase().includes(lower)
    || permission.description?.toLowerCase().includes(lower)
    || permission.key.toLowerCase().includes(lower)
  ));
}

function formatRole(role) {
  if (!role) {
    return 'Member';
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleString();
  } catch (error) {
    console.error('Failed to format date', error);
    return '-';
  }
}

function renderPermissionBadges(permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return <span className="text-xs text-gray-400 italic">No extra access</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {permissions.map((permissionKey) => (
        <span
          key={permissionKey}
          className="rounded-full bg-sky-500/15 border border-sky-500/40 px-3 py-1 text-xs font-semibold text-sky-200"
        >
          {FEATURE_PERMISSION_LOOKUP[permissionKey]?.label ?? permissionKey}
        </span>
      ))}
    </div>
  );
}

export default function OwlStudiosView() {
  const state = useAppState();
  const {
    currentUser,
    users,
    supervisionLinks = [],
    featureGrantMatrix = {},
    featureLayouts = [],
    invoiceTemplates = {},
    purchaseOrderTemplates = {},
  } = state;
  const {
    assignFeaturePermissions,
    clearFeaturePermissions,
    pushNotification,
    createFeatureLayout,
    deleteFeatureLayout,
    openModal,
    closeModal,
    saveInvoiceTemplate,
    savePurchaseOrderTemplate,
  } = useAppActions();

  const currentUserId = currentUser?.id ?? null;
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const templateScope = isAdmin
    ? 'global'
    : isManager && currentUserId != null
      ? `manager:${currentUserId}`
      : null;
  const invoiceDefaultTemplateId = defaultInvoiceTemplateId;
  const invoiceGlobalTemplateEntry = useMemo(
    () => getInvoiceTemplateEntry({ invoiceTemplates }, 'global'),
    [invoiceTemplates],
  );
  const invoiceScopeTemplateEntry = useMemo(
    () => (templateScope ? getInvoiceTemplateEntry({ invoiceTemplates }, templateScope) : null),
    [invoiceTemplates, templateScope],
  );
  const invoiceEffectiveTemplateEntry = useMemo(() => {
    if (isManager) {
      return invoiceScopeTemplateEntry ?? invoiceGlobalTemplateEntry;
    }
    if (isAdmin) {
      return invoiceScopeTemplateEntry ?? invoiceGlobalTemplateEntry;
    }
    return invoiceGlobalTemplateEntry;
  }, [isManager, isAdmin, invoiceScopeTemplateEntry, invoiceGlobalTemplateEntry]);
  const invoiceActiveTemplateId = invoiceEffectiveTemplateEntry?.templateId ?? invoiceDefaultTemplateId;
  const invoiceActiveTemplate = getInvoiceTemplateById(invoiceActiveTemplateId);
  const invoiceScopeHasOverride = Boolean(invoiceScopeTemplateEntry);
  const invoiceInheritsGlobalTemplate = isManager && !invoiceScopeHasOverride;
  const galleryCanCustomize = isAdmin || isManager;
  const invoiceScopeLabel = isAdmin
    ? 'Universal company template'
    : 'Invoices generated by you and your supervised team';
  const invoiceTemplateUpdatedLabel = useMemo(
    () => (invoiceEffectiveTemplateEntry?.updatedAt ? formatDate(invoiceEffectiveTemplateEntry.updatedAt) : null),
    [invoiceEffectiveTemplateEntry?.updatedAt],
  );
  const invoiceTemplateUpdatedByUser = useMemo(() => {
    if (!invoiceEffectiveTemplateEntry?.updatedBy) {
      return null;
    }
    return users.find((user) => Number(user.id) === Number(invoiceEffectiveTemplateEntry.updatedBy)) ?? null;
  }, [invoiceEffectiveTemplateEntry?.updatedBy, users]);
  const invoiceTemplateInfoMessage = useMemo(() => {
    if (isAdmin) {
      return 'Choose the invoice layout used across the entire company.';
    }
    if (isManager) {
      return invoiceInheritsGlobalTemplate
        ? 'You are currently inheriting the company template. Select a design to override it for your supervised team.'
        : 'This template applies to invoices created by you and your supervised team.';
    }
    return 'Invoices use the company template configured by your administrator.';
  }, [isAdmin, isManager, invoiceInheritsGlobalTemplate]);

  const purchaseOrderDefaultTemplateId = defaultPurchaseOrderTemplateId;
  const purchaseOrderGlobalTemplateEntry = useMemo(
    () => getPurchaseOrderTemplateEntry({ purchaseOrderTemplates }, 'global'),
    [purchaseOrderTemplates],
  );
  const purchaseOrderScopeTemplateEntry = useMemo(
    () => (templateScope ? getPurchaseOrderTemplateEntry({ purchaseOrderTemplates }, templateScope) : null),
    [purchaseOrderTemplates, templateScope],
  );
  const purchaseOrderEffectiveTemplateEntry = useMemo(() => {
    if (isManager) {
      return purchaseOrderScopeTemplateEntry ?? purchaseOrderGlobalTemplateEntry;
    }
    if (isAdmin) {
      return purchaseOrderScopeTemplateEntry ?? purchaseOrderGlobalTemplateEntry;
    }
    return purchaseOrderGlobalTemplateEntry;
  }, [isManager, isAdmin, purchaseOrderScopeTemplateEntry, purchaseOrderGlobalTemplateEntry]);
  const purchaseOrderActiveTemplateId = purchaseOrderEffectiveTemplateEntry?.templateId ?? purchaseOrderDefaultTemplateId;
  const purchaseOrderActiveTemplate = getPurchaseOrderTemplateById(purchaseOrderActiveTemplateId);
  const purchaseOrderScopeHasOverride = Boolean(purchaseOrderScopeTemplateEntry);
  const purchaseOrderInheritsGlobalTemplate = isManager && !purchaseOrderScopeHasOverride;
  const purchaseOrderTemplateUpdatedLabel = useMemo(
    () => (purchaseOrderEffectiveTemplateEntry?.updatedAt ? formatDate(purchaseOrderEffectiveTemplateEntry.updatedAt) : null),
    [purchaseOrderEffectiveTemplateEntry?.updatedAt],
  );
  const purchaseOrderTemplateUpdatedByUser = useMemo(() => {
    if (!purchaseOrderEffectiveTemplateEntry?.updatedBy) {
      return null;
    }
    return users.find((user) => Number(user.id) === Number(purchaseOrderEffectiveTemplateEntry.updatedBy)) ?? null;
  }, [purchaseOrderEffectiveTemplateEntry?.updatedBy, users]);
  const purchaseOrderTemplateInfoMessage = useMemo(() => {
    if (isAdmin) {
      return 'Choose the purchase order layout used across the entire company.';
    }
    if (isManager) {
      return purchaseOrderInheritsGlobalTemplate
        ? 'You are currently inheriting the company template. Select a design to override it for your supervised team.'
        : 'This template applies to purchase orders created by you and your supervised team.';
    }
    return 'Purchase orders use the company template configured by your administrator.';
  }, [isAdmin, isManager, purchaseOrderInheritsGlobalTemplate]);
  const purchaseOrderScopeLabel = isAdmin
    ? 'Universal company template'
    : 'Purchase orders generated by you and your supervised team';

  const presentConfirmation = useCallback(
    ({
      title = 'Confirm Action',
      message,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      confirmTone = 'primary',
      onConfirm,
      onCancel,
    }) => {
      openModal(ConfirmModal, {
        title,
        message,
        confirmLabel,
        cancelLabel,
        confirmTone,
        onConfirm: async () => {
          await Promise.resolve(onConfirm?.());
          closeModal();
        },
        onCancel: () => {
          closeModal();
          onCancel?.();
        },
      });
    },
    [openModal, closeModal],
  );

  const handleSelectInvoiceTemplate = useCallback(
    (templateId) => {
      if (!galleryCanCustomize || !templateScope) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to change the invoice template.',
        });
        return;
      }
      saveInvoiceTemplate(templateScope, templateId, undefined, { updatedBy: currentUserId });
      const selectedTemplate = getInvoiceTemplateById(templateId);
      pushNotification({
        type: 'success',
        message: `Invoice template set to ${selectedTemplate?.name ?? 'selected layout'}.`,
      });
    },
    [galleryCanCustomize, templateScope, saveInvoiceTemplate, currentUserId, pushNotification],
  );

  const handleCustomizeInvoiceTemplate = useCallback(
    (template, isActive = false) => {
      if (!galleryCanCustomize || !templateScope) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to customise the invoice template.',
        });
        return;
      }
      const targetId = template.id;
      const startingConfig = (isActive && invoiceEffectiveTemplateEntry && invoiceEffectiveTemplateEntry.templateId === targetId)
        ? invoiceEffectiveTemplateEntry.config
        : cloneTemplateConfig(template.baseConfig);
      openModal(InvoiceModificationModal, {
        initialTemplate: startingConfig,
        scopeLabel: invoiceScopeLabel,
        onSave: (customConfig) => {
          saveInvoiceTemplate(templateScope, targetId, customConfig, { updatedBy: currentUserId });
          pushNotification({
            type: 'success',
            message: `Template "${template.name}" customised successfully.`,
          });
          closeModal();
        },
        onClose: () => closeModal(),
      });
    },
    [
      galleryCanCustomize,
      templateScope,
      invoiceEffectiveTemplateEntry,
      openModal,
      closeModal,
      saveInvoiceTemplate,
      currentUserId,
      pushNotification,
      invoiceScopeLabel,
    ],
  );

  const handleSelectPurchaseOrderTemplate = useCallback(
    (templateId) => {
      if (!galleryCanCustomize || !templateScope) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to change the purchase order template.',
        });
        return;
      }
      savePurchaseOrderTemplate(templateScope, templateId, undefined, { updatedBy: currentUserId });
      const selectedTemplate = getPurchaseOrderTemplateById(templateId);
      pushNotification({
        type: 'success',
        message: `Purchase order template set to ${selectedTemplate?.name ?? 'selected layout'}.`,
      });
    },
    [galleryCanCustomize, templateScope, savePurchaseOrderTemplate, currentUserId, pushNotification],
  );

  const handleCustomizePurchaseOrderTemplate = useCallback(
    (template, isActive = false) => {
      if (!galleryCanCustomize || !templateScope) {
        pushNotification({
          type: 'warning',
          message: 'You do not have permission to customise the purchase order template.',
        });
        return;
      }
      const targetId = template.id;
      const startingConfig = (isActive
        && purchaseOrderEffectiveTemplateEntry
        && purchaseOrderEffectiveTemplateEntry.templateId === targetId)
        ? purchaseOrderEffectiveTemplateEntry.config
        : cloneTemplateConfig(template.baseConfig);
      openModal(PurchaseOrderModificationModal, {
        initialTemplate: startingConfig,
        scopeLabel: purchaseOrderScopeLabel,
        onSave: (customConfig) => {
          savePurchaseOrderTemplate(templateScope, targetId, customConfig, { updatedBy: currentUserId });
          pushNotification({
            type: 'success',
            message: `Template "${template.name}" customised successfully.`,
          });
          closeModal();
        },
        onClose: () => closeModal(),
      });
    },
    [
      galleryCanCustomize,
      templateScope,
      purchaseOrderEffectiveTemplateEntry,
      openModal,
      closeModal,
      savePurchaseOrderTemplate,
      currentUserId,
      pushNotification,
      purchaseOrderScopeLabel,
    ],
  );

  const employeePool = useMemo(() => {
    if (!currentUserId) {
      return [];
    }
    if (isAdmin) {
      return normalizeEmployeesForAdmin(users, currentUserId);
    }
    if (isManager) {
      return normalizeEmployeesForManager(supervisionLinks, users, currentUserId);
    }
    return [];
  }, [currentUserId, isAdmin, isManager, supervisionLinks, users]);

  const supervisedEmployeeIds = useMemo(() => {
    if (!isManager || !currentUserId) {
      return new Set();
    }
    return new Set(
      supervisionLinks
        .filter((link) => link.status === 'active' && String(link.managerId) === String(currentUserId))
        .map((link) => Number(link.employeeId)),
    );
  }, [currentUserId, isManager, supervisionLinks]);

  const [searchTerm, setSearchTerm] = useState('');
  const filteredEmployees = useMemo(
    () => filterEmployees(employeePool, searchTerm),
    [employeePool, searchTerm],
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => (
    filteredEmployees.length ? filteredEmployees[0].id : null
  ));

  const selectedEmployee = useMemo(() => {
    if (selectedEmployeeId == null) {
      return null;
    }
    return employeePool.find((employee) => employee.id === selectedEmployeeId) ?? null;
  }, [employeePool, selectedEmployeeId]);

  const selectedGrant = useMemo(() => {
    if (selectedEmployeeId == null) {
      return {};
    }
    return featureGrantMatrix[String(selectedEmployeeId)] ?? {};
  }, [featureGrantMatrix, selectedEmployeeId]);

  const [workingPermissions, setWorkingPermissions] = useState(new Set());

  useEffect(() => {
    if (!selectedEmployee) {
      setWorkingPermissions(new Set());
      return;
    }
    setWorkingPermissions(computeEffectivePermissions(selectedEmployee.role, selectedGrant));
  }, [selectedEmployee, selectedGrant]);

  const [permissionQuery, setPermissionQuery] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [layoutName, setLayoutName] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [isTemplateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateManagerTab, setTemplateManagerTab] = useState('invoices');

  const invoiceStatusLabel = invoiceInheritsGlobalTemplate
    ? `Inheriting: ${invoiceActiveTemplate?.name ?? 'Default'}`
    : `Active: ${invoiceActiveTemplate?.name ?? 'Default'}`;
  const purchaseOrderStatusLabel = purchaseOrderInheritsGlobalTemplate
    ? `Inheriting: ${purchaseOrderActiveTemplate?.name ?? 'Default'}`
    : `Active: ${purchaseOrderActiveTemplate?.name ?? 'Default'}`;

  const activeTemplateSummary = templateManagerTab === 'invoices'
    ? {
        info: invoiceTemplateInfoMessage,
        updatedLabel: invoiceTemplateUpdatedLabel,
        updatedBy: invoiceTemplateUpdatedByUser,
      }
    : {
        info: purchaseOrderTemplateInfoMessage,
        updatedLabel: purchaseOrderTemplateUpdatedLabel,
        updatedBy: purchaseOrderTemplateUpdatedByUser,
      };
  const [isControlCentreOpen, setControlCentreOpen] = useState(false);
  const filteredPermissions = useMemo(
    () => filterPermissions(FEATURE_PERMISSIONS, permissionQuery),
    [permissionQuery],
  );

  useEffect(() => {
    setSelectedEmployeeIds((prev) =>
      prev.filter((employeeId) => employeePool.some((employee) => employee.id === employeeId)),
    );
  }, [employeePool]);

  const selectEmployeePrimary = useCallback((employeeId) => {
    setSelectedEmployeeId(employeeId);
    if (employeeId == null) {
      return;
    }
    setSelectedEmployeeIds((prev) => {
      const without = prev.filter((id) => id !== employeeId);
      return [employeeId, ...without];
    });
  }, []);

  const toggleEmployeeSelection = useCallback((employeeId) => {
    setSelectedEmployeeIds((prev) => {
      if (prev.includes(employeeId)) {
        const next = prev.filter((id) => id !== employeeId);
        const fallback = next.length > 0
          ? next[0]
          : employeePool.find((employee) => employee.id !== employeeId)?.id ?? null;
        setSelectedEmployeeId((current) => {
          if (current === employeeId) {
            return fallback ?? null;
          }
          return current;
        });
        if (next.length > 0) {
          return next;
        }
        return fallback != null ? [fallback] : [];
      }
      return [...prev, employeeId];
    });
  }, [employeePool]);

  const clearEmployeeSelection = useCallback(() => {
    const fallback = filteredEmployees[0]?.id ?? null;
    if (fallback != null) {
      setSelectedEmployeeIds([]);
      selectEmployeePrimary(fallback);
    } else {
      setSelectedEmployeeIds([]);
      setSelectedEmployeeId(null);
    }
  }, [filteredEmployees, selectEmployeePrimary]);

  useEffect(() => {
    if (!employeePool.length) {
      setSelectedEmployeeId(null);
      setSelectedEmployeeIds([]);
      return;
    }
    if (selectedEmployeeId == null || !employeePool.some((employee) => employee.id === selectedEmployeeId)) {
      selectEmployeePrimary(employeePool[0].id);
    }
  }, [employeePool, selectEmployeePrimary, selectedEmployeeId]);

  const layoutTargets = useMemo(() => {
    if (selectedEmployeeIds.length > 0) {
      return selectedEmployeeIds;
    }
    return selectedEmployeeId != null ? [selectedEmployeeId] : [];
  }, [selectedEmployeeIds, selectedEmployeeId]);

  const selectedEmployeeDetails = useMemo(
    () => selectedEmployeeIds
      .map((id) => employeePool.find((employee) => employee.id === id))
      .filter(Boolean),
    [employeePool, selectedEmployeeIds],
  );

  const orderedEmployees = useMemo(() => {
    const selectionIndex = new Map(selectedEmployeeIds.map((id, index) => [id, index]));
    return [...filteredEmployees].sort((a, b) => {
      if (a.id === selectedEmployeeId && b.id !== selectedEmployeeId) {
        return -1;
      }
      if (b.id === selectedEmployeeId && a.id !== selectedEmployeeId) {
        return 1;
      }
      const aIndex = selectionIndex.has(a.id) ? selectionIndex.get(a.id) : Number.POSITIVE_INFINITY;
      const bIndex = selectionIndex.has(b.id) ? selectionIndex.get(b.id) : Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredEmployees, selectedEmployeeId, selectedEmployeeIds]);

  const handleSelectEmployee = useCallback((employeeId) => {
    selectEmployeePrimary(employeeId);
  }, [selectEmployeePrimary]);

  const handleTogglePermission = useCallback((permissionKey) => {
    setWorkingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionKey)) {
        next.delete(permissionKey);
      } else {
        next.add(permissionKey);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setWorkingPermissions(new Set(FEATURE_PERMISSIONS.map((permission) => permission.key)));
  }, []);

  const handleClear = useCallback(() => {
    if (!selectedEmployee) {
      setWorkingPermissions(new Set());
      return;
    }
    setWorkingPermissions(getRoleDefaultFeatures(selectedEmployee.role));
  }, [selectedEmployee]);

  const defaultFeatureSet = useMemo(() => {
    if (!selectedEmployee) {
      return new Set();
    }
    return getRoleDefaultFeatures(selectedEmployee.role);
  }, [selectedEmployee]);

  const currentEffectivePermissions = useMemo(() => {
    if (!selectedEmployee) {
      return new Set();
    }
    return computeEffectivePermissions(selectedEmployee.role, selectedGrant);
  }, [selectedEmployee, selectedGrant]);

  const currentMissingPermissions = useMemo(
    () => FEATURE_PERMISSIONS.filter((permission) => !currentEffectivePermissions.has(permission.key)),
    [currentEffectivePermissions],
  );

  const previewMissingPermissions = useMemo(
    () => FEATURE_PERMISSIONS.filter((permission) => !workingPermissions.has(permission.key)),
    [workingPermissions],
  );

  const grantorUser = useMemo(() => {
    if (selectedGrant.grantedBy == null) {
      return null;
    }
    return users.find((user) => String(user.id) === String(selectedGrant.grantedBy)) ?? null;
  }, [selectedGrant.grantedBy, users]);

  const desiredOverrides = useMemo(() => {
    if (!selectedEmployee) {
      return { granted: [], revoked: [] };
    }
    const defaults = defaultFeatureSet;
    const desired = workingPermissions;
    const granted = [];
    const revoked = [];
    FEATURE_PERMISSIONS.forEach((permission) => {
      const key = permission.key;
      const inDefault = defaults.has(key);
      const hasAccess = desired.has(key);
      if (hasAccess && !inDefault) {
        granted.push(key);
      } else if (!hasAccess && inDefault) {
        revoked.push(key);
      }
    });
    return { granted, revoked };
  }, [defaultFeatureSet, selectedEmployee, workingPermissions]);

  const performPermissionUpdate = useCallback(() => {
    const grantedPermissions = desiredOverrides.granted;
    const revokedPermissions = desiredOverrides.revoked;
    if (grantedPermissions.length === 0 && revokedPermissions.length === 0) {
      clearFeaturePermissions(selectedEmployeeId);
      pushNotification({ type: 'info', message: 'Access reset to role defaults.' });
    } else {
      assignFeaturePermissions(
        selectedEmployeeId,
        grantedPermissions,
        revokedPermissions,
        currentUserId,
      );
      pushNotification({ type: 'success', message: 'Permissions updated successfully.' });
    }
  }, [
    assignFeaturePermissions,
    clearFeaturePermissions,
    currentUserId,
    desiredOverrides.granted,
    desiredOverrides.revoked,
    pushNotification,
    selectedEmployeeId,
  ]);
  const targetCount = layoutTargets.length;
  const canApplyLayouts = targetCount > 0;
  const layoutTargetLabel = targetCount > 1
    ? `${targetCount} employees`
    : targetCount === 1
      ? '1 employee'
      : 'the selected employee';

  const handleSaveLayoutFromSelection = useCallback(() => {
    const trimmedName = layoutName.trim();
    if (!trimmedName) {
      pushNotification({ type: 'warning', message: 'Enter a name for the layout before saving.' });
      return;
    }
    if (!selectedEmployee) {
      pushNotification({ type: 'warning', message: 'Select an employee to capture their current access as a layout.' });
      return;
    }
    presentConfirmation({
      title: 'Save Layout',
      message: `Save the current access for ${selectedEmployee.name} as layout "${trimmedName}"?`,
      confirmLabel: 'Save Layout',
      confirmTone: 'warning',
      onConfirm: () => {
        createFeatureLayout({
          name: trimmedName,
          description: layoutDescription.trim(),
          grantedPermissions: desiredOverrides.granted,
          revokedPermissions: desiredOverrides.revoked,
        });
        pushNotification({ type: 'success', message: `Layout "${trimmedName}" saved.` });
        setLayoutName('');
        setLayoutDescription('');
      },
    });
  }, [
    createFeatureLayout,
    desiredOverrides.granted,
    desiredOverrides.revoked,
    presentConfirmation,
    layoutDescription,
    layoutName,
    pushNotification,
    selectedEmployee,
  ]);

  const handleDeleteLayout = useCallback(
    (layoutId, name) => {
      presentConfirmation({
        title: 'Delete Layout',
        message: `Delete layout${name ? ` "${name}"` : ''}? This action cannot be undone.`,
        confirmLabel: 'Delete Layout',
        confirmTone: 'danger',
        onConfirm: () => {
          deleteFeatureLayout(layoutId);
          pushNotification({ type: 'info', message: `Layout${name ? ` "${name}"` : ''} deleted.` });
        },
      });
    },
    [deleteFeatureLayout, presentConfirmation, pushNotification],
  );

  const handleApplyLayout = useCallback(
    (layout) => {
      if (!layout) {
        return;
      }
      const targets = layoutTargets.filter((employeeId) =>
        employeePool.some((employee) => employee.id === employeeId),
      );
      if (!targets.length) {
        pushNotification({ type: 'warning', message: 'Select at least one employee to apply the layout.' });
        return;
      }
      const targetSummary = targets.length === 1
        ? employeePool.find((employee) => employee.id === targets[0])?.name ?? 'the selected employee'
        : `${targets.length} employees`;
      presentConfirmation({
        title: 'Apply Layout',
        message: `Apply layout "${layout.name}" to ${targetSummary}? This will overwrite their existing access.`,
        confirmLabel: 'Apply Layout',
        confirmTone: 'warning',
        onConfirm: () => {
          targets.forEach((employeeId) => {
            const granted = Array.isArray(layout.grantedPermissions) ? layout.grantedPermissions : [];
            const revoked = Array.isArray(layout.revokedPermissions) ? layout.revokedPermissions : [];
            if (granted.length === 0 && revoked.length === 0) {
              clearFeaturePermissions(employeeId);
            } else {
              assignFeaturePermissions(employeeId, granted, revoked, currentUserId);
            }
          });
          pushNotification({
            type: 'success',
            message: `Layout "${layout.name}" applied to ${targets.length} employee${targets.length === 1 ? '' : 's'}.`,
          });
        },
      });
    },
    [
      assignFeaturePermissions,
      clearFeaturePermissions,
      currentUserId,
      employeePool,
      layoutTargets,
      presentConfirmation,
      pushNotification,
    ],
  );

  const existingGranted = Array.isArray(selectedGrant.grantedPermissions)
    ? selectedGrant.grantedPermissions
    : Array.isArray(selectedGrant.permissions)
      ? selectedGrant.permissions
      : [];
  const existingRevoked = Array.isArray(selectedGrant.revokedPermissions)
    ? selectedGrant.revokedPermissions
    : [];

  const hasChanges = useMemo(() => {
    if (!selectedEmployee) {
      return false;
    }
    const desiredGrantedSet = new Set(desiredOverrides.granted);
    const desiredRevokedSet = new Set(desiredOverrides.revoked);
    const existingGrantedSet = new Set(existingGranted);
    const existingRevokedSet = new Set(existingRevoked);

    if (desiredGrantedSet.size !== existingGrantedSet.size) {
      return true;
    }
    for (const permission of desiredGrantedSet) {
      if (!existingGrantedSet.has(permission)) {
        return true;
      }
    }
    if (desiredRevokedSet.size !== existingRevokedSet.size) {
      return true;
    }
    for (const permission of desiredRevokedSet) {
      if (!existingRevokedSet.has(permission)) {
        return true;
      }
    }
    return false;
  }, [desiredOverrides, existingGranted, existingRevoked, selectedEmployee]);

  const handleSave = useCallback(() => {
    if (selectedEmployeeId == null) {
      pushNotification({ type: 'warning', message: 'Select an employee first.' });
      return;
    }
    if (!selectedEmployee) {
      pushNotification({ type: 'warning', message: 'Select an employee first.' });
      return;
    }
    presentConfirmation({
      title: 'Confirm Permission Update',
      message: `Are you sure you want to update access for ${selectedEmployee.name}? This will immediately change their permissions.`,
      confirmLabel: 'Apply Changes',
      confirmTone: 'warning',
      onConfirm: performPermissionUpdate,
    });
  }, [presentConfirmation, performPermissionUpdate, selectedEmployee, selectedEmployeeId, pushNotification]);

  if (!currentUserId || (!isAdmin && !isManager)) {
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        Access Control is available to administrators and managers.
      </div>
    );
  }

  if (filteredEmployees.length === 0) {
    if (employeePool.length === 0) {
      const emptyMessage = isAdmin
        ? 'Add team members before assigning access.'
        : 'Add supervised employees before assigning additional access.';
      return (
        <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
          {emptyMessage}
        </div>
      );
    }
    return (
      <div className="perplexity-card p-8 text-center text-gray-400 fade-in">
        No employees match this search. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Owl Studios</h2>
        <p className="text-gray-400">
          Manage granular access for your team. Select an employee to review or adjust their additional permissions.
        </p>
      </header>

      <div className="perplexity-card p-4 space-y-4 sm:flex sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Document Templates</h3>
          <p className="text-xs text-gray-500">
            Manage the layouts used for invoices and purchase orders across your workspace.
          </p>
          {activeTemplateSummary.updatedLabel ? (
            <p className="text-[11px] text-gray-500">
              Last updated {activeTemplateSummary.updatedLabel}
              {activeTemplateSummary.updatedBy ? ` by ${activeTemplateSummary.updatedBy.name}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap justify-end gap-2">
            <div className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
              {invoiceStatusLabel}
            </div>
            <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              {purchaseOrderStatusLabel}
            </div>
          </div>
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              isTemplateManagerOpen
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20'
                : 'border-gray-700/60 bg-gray-900/40 text-gray-200 hover:border-sky-500/40'
            }`}
            onClick={() => setTemplateManagerOpen((prev) => !prev)}
          >
            <i className={`fas ${isTemplateManagerOpen ? 'fa-chevron-up' : 'fa-file-invoice'} text-xs`} />
            Document Templates
          </button>
        </div>
      </div>

      {isTemplateManagerOpen ? (
        <div className="perplexity-card p-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-gray-200">
                {templateManagerTab === 'invoices' ? 'Invoice Templates' : 'Purchase Order Templates'}
              </h4>
              <p className="text-xs text-gray-500">{activeTemplateSummary.info}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  templateManagerTab === 'invoices'
                    ? 'border-sky-500/60 bg-sky-500/20 text-sky-100'
                    : 'border-gray-700/60 bg-gray-900/50 text-gray-300 hover:border-sky-500/40'
                }`}
                onClick={() => setTemplateManagerTab('invoices')}
              >
                Invoices
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  templateManagerTab === 'purchase-orders'
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100'
                    : 'border-gray-700/60 bg-gray-900/50 text-gray-300 hover:border-emerald-500/40'
                }`}
                onClick={() => setTemplateManagerTab('purchase-orders')}
              >
                Purchase Orders
              </button>
            </div>
          </div>

          {!galleryCanCustomize ? (
            <p className="text-xs text-amber-300 text-center sm:text-left">
              You can preview templates but only administrators or supervisors can save changes.
            </p>
          ) : null}

          {templateManagerTab === 'invoices' ? (
            <InvoiceTemplateSelector
              activeTemplateId={invoiceActiveTemplateId}
              onSelectTemplate={handleSelectInvoiceTemplate}
              onCustomizeTemplate={handleCustomizeInvoiceTemplate}
              canCustomize={galleryCanCustomize}
            />
          ) : (
            <PurchaseOrderTemplateSelector
              activeTemplateId={purchaseOrderActiveTemplateId}
              onSelectTemplate={handleSelectPurchaseOrderTemplate}
              onCustomizeTemplate={handleCustomizePurchaseOrderTemplate}
              canCustomize={galleryCanCustomize}
            />
          )}
        </div>
      ) : null}

      <div className="perplexity-card p-4 space-y-4 sm:flex sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Access Toolkit</h3>
          <p className="text-xs text-gray-500">
            Open the User Control Centre to search employees, review permissions, and manage overrides.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              isControlCentreOpen
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-100 hover:bg-sky-500/20'
                : 'border-gray-700/60 bg-gray-900/40 text-gray-200 hover:border-sky-500/40'
            }`}
            onClick={() => setControlCentreOpen((prev) => !prev)}
          >
            <i className={`fas ${isControlCentreOpen ? 'fa-chevron-up' : 'fa-sliders-h'} text-xs`} />
            User Control Centre
          </button>
        </div>
      </div>

      {isControlCentreOpen ? (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <aside className="perplexity-card p-4 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-gray-400">Search Employees</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-2">
                <i className="fas fa-search text-gray-500"></i>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                  placeholder="Search by name or email"
                />
              </div>
            </div>

            {selectedEmployeeDetails.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Selected ({selectedEmployeeDetails.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors"
                    onClick={clearEmployeeSelection}
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1 custom-scroll">
                  {selectedEmployeeDetails.map((employee) => {
                    const isPrimary = employee.id === selectedEmployeeId;
                    return (
                      <div
                        key={employee.id}
                        className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                          isPrimary
                            ? 'border-sky-500/70 bg-sky-500/15 text-sky-100'
                            : 'border-gray-700/60 bg-gray-900/50 text-gray-200'
                        }`}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2"
                          onClick={() => selectEmployeePrimary(employee.id)}
                        >
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
                          <span>{employee.name}</span>
                        </button>
                        <button
                          type="button"
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          onClick={() => toggleEmployeeSelection(employee.id)}
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scroll scroll-area">
            {orderedEmployees.map((employee) => {
              const grantEntry = featureGrantMatrix[String(employee.id)] ?? {};
              const isSelected = employee.id === selectedEmployeeId;
              const isBulkSelected = selectedEmployeeIds.includes(employee.id);
              const grantCount = Array.isArray(grantEntry.grantedPermissions)
                ? grantEntry.grantedPermissions.length
                : Array.isArray(grantEntry.permissions)
                  ? grantEntry.permissions.length
                  : 0;
              const revokeCount = Array.isArray(grantEntry.revokedPermissions) ? grantEntry.revokedPermissions.length : 0;
              const overrideCount = grantCount + revokeCount;
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => handleSelectEmployee(employee.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    isSelected
                      ? 'border-sky-500/60 bg-sky-500/10 text-white'
                      : 'border-gray-700/60 bg-gray-900/40 text-gray-200 hover:border-sky-500/40'
                  } ${isBulkSelected ? 'ring-2 ring-sky-500/70' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isBulkSelected}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleEmployeeSelection(employee.id);
                        }}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
                      />
                      <span className="font-semibold">{employee.name}</span>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-gray-400">{formatRole(employee.role)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{employee.email || 'No email'}</div>
                  <div className="mt-2 text-xs text-gray-400">
                    {overrideCount > 0
                      ? `${overrideCount} custom override${overrideCount === 1 ? '' : 's'}`
                      : 'Using role defaults'}
                  </div>
                </button>
              );
            })}
            </div>
          </aside>

          <section className="perplexity-card p-6 space-y-6">
            {selectedEmployee ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedEmployee.name}</h3>
                    <p className="text-sm text-gray-400">
                      {formatRole(selectedEmployee.role)} - {selectedEmployee.email || 'No email'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Toggle permissions to grant access to specific sections of the app.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-700/70 bg-gray-900/40 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800/40 transition-colors"
                      onClick={handleClear}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:border-sky-500/60 transition-colors"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Currently Locked</h5>
                    {currentMissingPermissions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {currentMissingPermissions.map((permission) => (
                          <span
                            key={permission.key}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200"
                          >
                            {permission.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-300">
                        All available features are already accessible for this teammate.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-800 pt-3">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">After Your Changes</h5>
                    {previewMissingPermissions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {previewMissingPermissions.map((permission) => (
                          <span
                            key={permission.key}
                            className="rounded-full border border-gray-700/60 bg-gray-900/40 px-3 py-1 text-xs font-semibold text-gray-300"
                          >
                            {permission.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-300">
                        All feature areas will be unlocked once you save.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-wide text-gray-400">Filter Permissions</label>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/50 px-3 py-2">
                    <i className="fas fa-filter text-gray-500"></i>
                    <input
                      type="text"
                      value={permissionQuery}
                      onChange={(event) => setPermissionQuery(event.target.value)}
                      className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                      placeholder="Search permissions"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredPermissions.map((permission) => {
                    const isChecked = workingPermissions.has(permission.key);
                    const isDefault = defaultFeatureSet.has(permission.key);
                    const isGrantedOverride = !isDefault && isChecked;
                    const isRevokedOverride = isDefault && !isChecked;
                    return (
                      <label
                        key={permission.key}
                        className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                          isChecked
                            ? 'border-sky-500/60 bg-sky-500/10 text-white'
                            : 'border-gray-700/60 bg-gray-900/40 text-gray-200 hover:border-sky-500/40'
                        } ${
                          isGrantedOverride
                            ? 'border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                            : isRevokedOverride
                              ? 'border-amber-500/80 bg-amber-500/10 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                              : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(permission.key)}
                          className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-sky-500 focus:ring-sky-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-white">{permission.label}</span>
                          <span className="text-xs text-gray-400">{permission.description}</span>
                        </span>
                      </label>
                    );
                  })}
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Layouts</h5>
                    <p className="text-xs text-gray-500">
                      Saved permission bundles. Apply to {layoutTargetLabel}.
                    </p>
                  </div>
                  {selectedEmployeeIds.length ? (
                    <button
                      type="button"
                      className="text-xs text-sky-300 hover:text-sky-200 transition-colors"
                      onClick={clearEmployeeSelection}
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={layoutName}
                    onChange={(event) => setLayoutName(event.target.value)}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    placeholder="Layout name"
                  />
                  <input
                    type="text"
                    value={layoutDescription}
                    onChange={(event) => setLayoutDescription(event.target.value)}
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    placeholder="Description (optional)"
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:border-sky-500/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleSaveLayoutFromSelection}
                    disabled={!layoutName.trim() || !selectedEmployee}
                  >
                    Save Layout
                  </button>
                </div>
                <div className="space-y-2">
                  {featureLayouts.length ? (
                    featureLayouts.map((layout) => (
                      <div
                        key={layout.id}
                        className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-950/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{layout.name}</p>
                          {layout.description ? (
                            <p className="text-xs text-gray-400">{layout.description}</p>
                          ) : null}
                          <p className="text-[11px] text-gray-500 mt-1">
                            {(layout.grantedPermissions?.length ?? 0)} grants · {(layout.revokedPermissions?.length ?? 0)} revokes
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${canApplyLayouts ? 'border-sky-500/60 text-sky-200 hover:bg-sky-500/10' : 'border-gray-700 text-gray-500 cursor-not-allowed'}`}
                            onClick={() => handleApplyLayout(layout)}
                            disabled={!canApplyLayouts}
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
                            onClick={() => handleDeleteLayout(layout.id, layout.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">
                      No layouts saved yet. Create one from the current access selection.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Current Access</h4>
                    <div className="mt-2">
                      {renderPermissionBadges(Array.from(workingPermissions))}
                    </div>
                    {desiredOverrides.granted.length > 0 ? (
                      <div className="mt-3 text-xs text-emerald-300">
                        <span className="font-semibold uppercase tracking-wide">Granted overrides:</span>{' '}
                        {desiredOverrides.granted
                          .map((key) => FEATURE_PERMISSION_LOOKUP[key]?.label ?? key)
                          .join(', ')}
                      </div>
                    ) : null}
                    {desiredOverrides.revoked.length > 0 ? (
                      <div className="mt-1 text-xs text-amber-300">
                        <span className="font-semibold uppercase tracking-wide">Revoked defaults:</span>{' '}
                        {desiredOverrides.revoked
                          .map((key) => FEATURE_PERMISSION_LOOKUP[key]?.label ?? key)
                          .join(', ')}
                      </div>
                    ) : null}
                    {selectedGrant.updatedAt ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Last updated {formatDate(selectedGrant.updatedAt)}
                        {grantorUser ? ` by ${grantorUser.name}` : null}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className={`px-5 py-2 rounded-xl font-semibold text-white transition-colors ${
                      hasChanges
                        ? 'bg-sky-600 hover:bg-sky-500'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={handleSave}
                    disabled={!hasChanges}
                  >
                    Save Changes
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                Select an employee to begin assigning permissions.
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}



