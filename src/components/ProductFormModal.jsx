import { useEffect, useMemo, useRef, useState } from 'react';

export default function ProductFormModal({
  title,
  mode = 'create',
  initialValues = {},
  categories = [],
  onSubmit,
  onCancel,
}) {
  const mountedRef = useRef(true);

  const createSellingUnitEntry = (unit = {}, fallbackBaseUnit = 'unit') => ({
    key: unit.key ?? `su-${Math.random().toString(36).slice(2, 11)}`,
    name: unit.name ?? fallbackBaseUnit ?? '',
    conversion: unit.conversion != null ? String(unit.conversion) : unit && Object.keys(unit).length > 0 ? '' : '1',
    price: unit.price != null ? String(unit.price) : '',
  });

  const buildInitialFormState = (values = {}) => {
    const baseUnitCandidate = values.baseUnit ?? values.sellingUnits?.[0]?.name ?? 'unit';
    const normalizedBaseUnit = typeof baseUnitCandidate === 'string' && baseUnitCandidate.trim()
      ? baseUnitCandidate.trim()
      : 'unit';
    const sellingUnitSource = Array.isArray(values.sellingUnits) && values.sellingUnits.length > 0
      ? values.sellingUnits
      : [
        {
          name: normalizedBaseUnit,
          conversion: 1,
          price: values.price ?? '',
        },
      ];

    return {
      name: values.name ?? '',
      sku: values.sku ?? '',
      category: values.category ?? '',
      baseUnit: normalizedBaseUnit,
      cost: values.cost != null ? String(values.cost) : '',
      stock: values.stock != null ? String(values.stock) : '',
      reorderLevel: values.reorderLevel != null ? String(values.reorderLevel) : '',
      supplier: values.supplier ?? '',
      imageUrl: values.imageUrl ?? '',
      description: values.description ?? '',
      sellingUnits: sellingUnitSource.map((unit) => createSellingUnitEntry(unit, normalizedBaseUnit)),
    };
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formState, setFormState] = useState(() => buildInitialFormState(initialValues));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormState(buildInitialFormState(initialValues));
    setErrors({});
    setSubmitError('');
  }, [initialValues]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const categoryOptions = useMemo(() => {
    const cleaned = categories.filter(Boolean).map((value) => value.trim()).filter(Boolean);
    return Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const inputClass = 'w-full rounded-lg border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40';
  const errorClass = 'text-xs text-red-400';

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'baseUnit') {
      setFormState((prev) => {
        const nextSellingUnits = prev.sellingUnits.length
          ? prev.sellingUnits.map((unit, index) => {
            if (index === 0 && unit.name === prev.baseUnit && Number.parseFloat(unit.conversion || '1') === 1) {
              return { ...unit, name: value };
            }
            return unit;
          })
          : [createSellingUnitEntry({ name: value, conversion: 1, price: '' }, value)];
        return { ...prev, baseUnit: value, sellingUnits: nextSellingUnits };
      });
      setErrors((prev) => ({ ...prev, baseUnit: undefined, sellingUnits: undefined }));
      return;
    }

    setFormState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSellingUnitChange = (index, field, value) => {
    setFormState((prev) => {
      const nextUnits = prev.sellingUnits.map((unit, unitIndex) => (
        unitIndex === index ? { ...unit, [field]: value } : unit
      ));
      return { ...prev, sellingUnits: nextUnits };
    });
    setErrors((prev) => ({ ...prev, sellingUnits: undefined }));
  };

  const handleAddSellingUnit = () => {
    setFormState((prev) => ({
      ...prev,
      sellingUnits: [
        ...prev.sellingUnits,
        createSellingUnitEntry({ name: '', conversion: '', price: '' }, prev.baseUnit || 'unit'),
      ],
    }));
    setErrors((prev) => ({ ...prev, sellingUnits: undefined }));
  };

  const handleRemoveSellingUnit = (index) => {
    setFormState((prev) => {
      if (prev.sellingUnits.length <= 1) {
        return prev;
      }
      const nextUnits = prev.sellingUnits.filter((_, unitIndex) => unitIndex !== index);
      return { ...prev, sellingUnits: nextUnits };
    });
    setErrors((prev) => ({ ...prev, sellingUnits: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formState.name.trim()) {
      nextErrors.name = 'Product name is required.';
    }
    if (!formState.category.trim()) {
      nextErrors.category = 'Category is required.';
    }
    if (!formState.baseUnit.trim()) {
      nextErrors.baseUnit = 'Base unit is required.';
    }
    const cost = Number.parseFloat(formState.cost || '0');
    if (Number.isNaN(cost) || cost < 0) {
      nextErrors.cost = 'Cost per base unit cannot be negative.';
    }
    const stock = Number.parseFloat(formState.stock || '0');
    if (Number.isNaN(stock) || stock < 0) {
      nextErrors.stock = 'Stock in base unit must be zero or a positive number.';
    }
    const reorderLevel = Number.parseInt(formState.reorderLevel || '0', 10);
    if (!Number.isNaN(reorderLevel) && reorderLevel < 0) {
      nextErrors.reorderLevel = 'Reorder level cannot be negative.';
    }

    if (!formState.sellingUnits.length) {
      nextErrors.sellingUnits = 'Add at least one selling unit.';
    } else {
      const unitErrors = formState.sellingUnits.map(() => ({}));

      formState.sellingUnits.forEach((unit, index) => {
        const currentErrors = {};
        if (!unit.name.trim()) {
          currentErrors.name = 'Unit name is required.';
        }
        const conversion = Number.parseFloat(unit.conversion);
        if (Number.isNaN(conversion) || conversion <= 0) {
          currentErrors.conversion = 'Conversion must be greater than 0.';
        }
        const unitPrice = Number.parseFloat(unit.price);
        if (Number.isNaN(unitPrice) || unitPrice < 0) {
          currentErrors.price = 'Price must be zero or a positive number.';
        }

        if (Object.keys(currentErrors).length > 0) {
          unitErrors[index] = currentErrors;
        }
      });

      if (unitErrors.some((value) => Object.keys(value).length > 0)) {
        nextErrors.sellingUnits = unitErrors;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    const normalized = {
      ...initialValues,
      name: formState.name.trim(),
      sku: formState.sku.trim(),
      category: formState.category.trim(),
      baseUnit: formState.baseUnit.trim(),
      cost: Number.parseFloat(formState.cost || '0'),
      stock: Number.parseFloat(formState.stock || '0'),
      reorderLevel: Number.parseInt(formState.reorderLevel || '0', 10),
      supplier: formState.supplier.trim(),
      imageUrl: formState.imageUrl.trim(),
      description: formState.description.trim(),
      sellingUnits: formState.sellingUnits.map((unit) => {
        const parsedConversion = Number.parseFloat(unit.conversion);
        const parsedPrice = Number.parseFloat(unit.price);
        return {
          name: unit.name.trim(),
          conversion: Number.isFinite(parsedConversion) && parsedConversion > 0 ? parsedConversion : 1,
          price: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0,
        };
      }),
    };

    setSubmitting(true);

    try {
      await Promise.resolve(onSubmit?.(normalized));
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSubmitError(error?.message ?? 'Failed to save product. Please try again.');
      setSubmitting(false);
      return;
    }

    if (!mountedRef.current) {
      return;
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h3 className="text-xl font-semibold text-white">{title ?? (mode === 'edit' ? 'Edit Product' : 'Add Product')}</h3>
        <p className="text-gray-400 text-sm">
          {mode === 'edit'
            ? 'Adjust details to keep inventory accurate.'
            : 'Add a new catalog item so teams can sell it immediately.'}
        </p>
      </header>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Name</span>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
              className={`${inputClass} ${errors.name ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Premium Laptop"
              required
            />
            {errors.name ? <span className={errorClass}>{errors.name}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">SKU</span>
            <input
              type="text"
              name="sku"
              value={formState.sku}
              onChange={handleChange}
              className={inputClass}
              placeholder="Optional stock keeping unit"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Category</span>
            <input
              type="text"
              name="category"
              list="product-category-options"
              value={formState.category}
              onChange={handleChange}
              className={`${inputClass} ${errors.category ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. Electronics"
              required
            />
            <datalist id="product-category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            {errors.category ? <span className={errorClass}>{errors.category}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Base Unit</span>
            <input
              type="text"
              name="baseUnit"
              value={formState.baseUnit}
              onChange={handleChange}
              className={`${inputClass} ${errors.baseUnit ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              placeholder="e.g. unit, piece, kg"
              required
            />
            {errors.baseUnit ? <span className={errorClass}>{errors.baseUnit}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Cost per Base Unit</span>
            <input
              type="number"
              name="cost"
              value={formState.cost}
              onChange={handleChange}
              className={`${inputClass} ${errors.cost ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            {errors.cost ? <span className={errorClass}>{errors.cost}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Stock in Base Unit</span>
            <input
              type="number"
              name="stock"
              value={formState.stock}
              onChange={handleChange}
              className={`${inputClass} ${errors.stock ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              min="0"
              step="1"
              placeholder="0"
            />
            {errors.stock ? <span className={errorClass}>{errors.stock}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Reorder Level</span>
            <input
              type="number"
              name="reorderLevel"
              value={formState.reorderLevel}
              onChange={handleChange}
              className={`${inputClass} ${errors.reorderLevel ? 'border-red-500/60 focus:ring-red-500' : ''}`}
              min="0"
              step="1"
              placeholder="0"
            />
            {errors.reorderLevel ? <span className={errorClass}>{errors.reorderLevel}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Supplier</span>
            <input
              type="text"
              name="supplier"
              value={formState.supplier}
              onChange={handleChange}
              className={inputClass}
              placeholder="Supplier name"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            <span className="text-sm font-medium text-gray-200">Image URL</span>
            <input
              type="url"
              name="imageUrl"
              value={formState.imageUrl}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://..."
            />
          </label>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white">Selling Units</h4>
              <p className="text-xs text-gray-400">
                Configure the units this product can be sold in, along with their conversion ratios and prices.
              </p>
            </div>
            <button
              type="button"
              className="perplexity-button px-3 py-2 text-sm font-semibold md:self-start"
              onClick={handleAddSellingUnit}
              disabled={submitting}
            >
              <i className="fas fa-plus mr-2" aria-hidden="true" />
              Add Selling Unit
            </button>
          </div>

          {typeof errors.sellingUnits === 'string' ? (
            <p className="text-xs font-medium text-red-400">{errors.sellingUnits}</p>
          ) : null}

          <div className="flex flex-col gap-3">
            {formState.sellingUnits.map((unit, index) => {
              const unitErrors = Array.isArray(errors.sellingUnits) ? errors.sellingUnits[index] ?? {} : {};
              const canRemove = formState.sellingUnits.length > 1;
              return (
                <div key={unit.key} className="space-y-3 rounded-lg border border-gray-700/60 bg-gray-900/50 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                      <span className="text-sm font-medium text-gray-200">Unit Name</span>
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(event) => handleSellingUnitChange(index, 'name', event.target.value)}
                        className={`${inputClass} ${unitErrors.name ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                        placeholder="e.g. box"
                        required
                      />
                      {unitErrors.name ? <span className={errorClass}>{unitErrors.name}</span> : null}
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                      <span className="text-sm font-medium text-gray-200">Conversion Factor</span>
                      <input
                        type="number"
                        value={unit.conversion}
                        onChange={(event) => handleSellingUnitChange(index, 'conversion', event.target.value)}
                        className={`${inputClass} ${unitErrors.conversion ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                        min="0"
                        step="0.01"
                        placeholder="e.g. 12"
                        required
                      />
                      <span className="text-xs text-gray-500">
                        Number of base units in this selling unit.
                      </span>
                      {unitErrors.conversion ? <span className={errorClass}>{unitErrors.conversion}</span> : null}
                    </label>

                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                      <span className="text-sm font-medium text-gray-200">Price</span>
                      <input
                        type="number"
                        value={unit.price}
                        onChange={(event) => handleSellingUnitChange(index, 'price', event.target.value)}
                        className={`${inputClass} ${unitErrors.price ? 'border-red-500/60 focus:ring-red-500' : ''}`}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        required
                      />
                      {unitErrors.price ? <span className={errorClass}>{unitErrors.price}</span> : null}
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/50 px-3 py-1 text-sm font-medium text-red-300 transition-colors hover:border-red-400 hover:text-red-200 disabled:opacity-40 disabled:hover:border-red-500/50 disabled:hover:text-red-300"
                      onClick={() => handleRemoveSellingUnit(index)}
                      disabled={!canRemove || submitting}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span className="text-sm font-medium text-gray-200">Description</span>
          <textarea
            name="description"
            value={formState.description}
            onChange={handleChange}
            className={`${inputClass} resize-none`}
            rows={4}
            placeholder="Brief details for sales teams"
          />
        </label>

        {submitError ? (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-700 bg-gray-800/70 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
            onClick={() => onCancel?.()}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="perplexity-button px-4 py-2 text-sm font-semibold"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
