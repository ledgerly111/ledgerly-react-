import { useCallback, useMemo, useState } from 'react';
import ProductDeleteModal from '../components/ProductDeleteModal.jsx';
import ProductFormModal from '../components/ProductFormModal.jsx';
import ReportDamageModal from '../components/ReportDamageModal.jsx';
import { useAppActions, useAppState } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/currency.js';

const CATEGORY_ALL = 'all';
const PLACEHOLDER_PRODUCT_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150"%3E%3Crect width="150" height="150" fill="%231f2937"/%3E%3Ctext x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="32" fill="%23f8fafc" font-family="Segoe UI, Arial, sans-serif"%3EIMG%3C/text%3E%3C/svg%3E';

export default function ProductsView() {
  const state = useAppState();
  const {
    addProduct,
    updateProduct,
    deleteProduct,
    pushNotification,
    openModal,
    closeModal,
    reportDamagedStock,
  } = useAppActions();
  const {
    products = [],
    categories = [],
    selectedCountry,
    currentUser,
    hasFeaturePermission,
  } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL);

  const normalizedProducts = useMemo(
    () =>
      products.map((product) => {
        const stock = product.stock ?? 0;
        const cost = product.cost ?? 0;
        const category = product.category ?? 'Other';
        const baseUnitName = product.baseUnit ?? product.sellingUnits?.[0]?.name ?? 'unit';
        const baseUnit = Array.isArray(product.sellingUnits)
          ? product.sellingUnits.find((unit) => unit && unit.name === baseUnitName)
          ?? product.sellingUnits[0]
          : null;
        const baseUnitPrice = Number(baseUnit?.price) || 0;
        return {
          ...product,
          stock,
          cost,
          category,
          baseUnitName,
          baseUnitPrice,
        };
      }),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filterCategory = categoryFilter;

    return normalizedProducts.filter((product) => {
      const matchesSearch = term
        ? [product.name, product.sku, product.description]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(term))
        : true;

      const matchesCategory = filterCategory === CATEGORY_ALL || product.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [normalizedProducts, searchTerm, categoryFilter]);

  const totals = useMemo(() => {
    const totalInventoryValue = normalizedProducts.reduce(
      (sum, product) => sum + product.baseUnitPrice * product.stock,
      0,
    );
    const outOfStockCount = normalizedProducts.filter((product) => product.stock <= 0).length;
    const totalPrice = normalizedProducts.reduce((sum, product) => sum + product.baseUnitPrice, 0);
    const averagePrice = normalizedProducts.length ? totalPrice / normalizedProducts.length : 0;

    return {
      totalProducts: normalizedProducts.length,
      totalInventoryValue,
      outOfStockCount,
      averagePrice,
    };
  }, [normalizedProducts]);

  const role = currentUser?.role ?? 'guest';

  const canUsePermission = useCallback(
    (permissionKey) => {
      if (!permissionKey) {
        return false;
      }
      if (role === 'admin') {
        return true;
      }
      if (typeof hasFeaturePermission === 'function') {
        return hasFeaturePermission(currentUser?.id, permissionKey);
      }
      return false;
    },
    [currentUser?.id, hasFeaturePermission, role],
  );

  const canManageProducts = useMemo(
    () => canUsePermission('products.manage'),
    [canUsePermission],
  );

  const ensureManagerAccess = useCallback(() => {
    if (canManageProducts) {
      return true;
    }
    pushNotification({ type: 'warning', message: 'You do not have permission to manage products.' });
    return false;
  }, [canManageProducts, pushNotification]);

  const getNextProductId = useCallback(() => {
    const numericIds = products
      .map((product) => Number(product?.id))
      .filter((value) => Number.isFinite(value));
    if (!numericIds.length) {
      return 1;
    }
    return Math.max(...numericIds) + 1;
  }, [products]);

  const formatValue = useCallback(
    (value) => formatCurrency(value, { countryCode: selectedCountry, showSymbol: true }),
    [selectedCountry],
  );

  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = PLACEHOLDER_PRODUCT_IMAGE;
  }, []);

  const openCreateProductModal = useCallback(() => {
    if (!ensureManagerAccess()) {
      return;
    }

    openModal(ProductFormModal, {
      title: 'Add Product',
      mode: 'create',
      categories,
      initialValues: {
        stock: 0,
        reorderLevel: 0,
      },
      onCancel: closeModal,
      onSubmit: (formProduct) => {
        const newProduct = {
          ...formProduct,
          id: getNextProductId(),
        };
        addProduct(newProduct);
        closeModal();
        pushNotification({
          type: 'success',
          message: 'Product added',
          description: `${formProduct.name} is now available in the catalog.`,
        });
      },
    });
  }, [
    ensureManagerAccess,
    openModal,
    categories,
    closeModal,
    getNextProductId,
    addProduct,
    pushNotification,
  ]);

  const openEditProductModal = useCallback(
    (product) => {
      if (!ensureManagerAccess()) {
        return;
      }

      openModal(ProductFormModal, {
        title: 'Edit Product',
        mode: 'edit',
        categories,
        initialValues: product,
        onCancel: closeModal,
        onSubmit: (formProduct) => {
          updateProduct({ ...product, ...formProduct });
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Product updated',
            description: `${formProduct.name} has been refreshed.`,
          });
        },
      });
    },
    [ensureManagerAccess, openModal, categories, closeModal, updateProduct, pushNotification],
  );

  const openDeleteProductModal = useCallback(
    (product) => {
      if (!ensureManagerAccess()) {
        return;
      }

      openModal(ProductDeleteModal, {
        product,
        onCancel: closeModal,
        onConfirm: () => {
          if (product?.id == null) {
            closeModal();
            return;
          }
          deleteProduct(product.id);
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Product deleted',
            description: `${product.name ?? 'Product'} removed from the catalog.`,
          });
        },
      });
    },
    [ensureManagerAccess, openModal, closeModal, deleteProduct, pushNotification],
  );

  const openReportDamageModal = useCallback(
    (product) => {
      if (!ensureManagerAccess()) {
        return;
      }

      openModal(ReportDamageModal, {
        modalClassName: 'modal-large',
        product,
        onCancel: closeModal,
        onSubmit: (data) => {
          reportDamagedStock(
            data.productId,
            data.quantity,
            data.reason,
            data.notes
          );
          closeModal();
          pushNotification({
            type: 'success',
            message: 'Damage reported',
            description: `${data.quantity} units marked as damaged.`,
          });
        },
      });
    },
    [ensureManagerAccess, openModal, closeModal, reportDamagedStock, pushNotification],
  );

  return (
    <div className="space-y-6 fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Product Catalog</h2>
          <p className="text-gray-400">Track inventory, pricing, and categories across your offerings.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`px-4 py-2 rounded-xl font-medium ${canManageProducts ? 'perplexity-button' : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            onClick={openCreateProductModal}
            disabled={!canManageProducts}
          >
            <i className="fas fa-plus mr-2" />Add Product
          </button>
        </div>
      </header>

      <section className="responsive-grid-4">
        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Products</p>
              <p className="text-2xl font-bold text-white">{totals.totalProducts}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-box text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Inventory Value</p>
              <p className="text-lg font-bold text-blue-400">{formatValue(totals.totalInventoryValue)}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-coins text-blue-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Out of Stock</p>
              <p className="text-lg font-bold text-white">{totals.outOfStockCount}</p>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-exclamation-triangle text-red-400" />
            </div>
          </div>
        </div>

        <div className="perplexity-card p-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Average Price (per base unit)</p>
              <p className="text-lg font-bold text-white">
                {formatValue(totals.averagePrice)}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <i className="fas fa-balance-scale text-emerald-400" />
            </div>
          </div>
        </div>
      </section>

      <div className="perplexity-card p-4 slide-up">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="product-search" className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="product-search"
                type="search"
                className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40"
                placeholder="Name, SKU, or description"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="product-category-filter" className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              id="product-category-filter"
              className="w-full bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value={CATEGORY_ALL}>All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="perplexity-card overflow-hidden">
        <div className="responsive-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Product</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Pricing</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Category</th>
                {canManageProducts ? (
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-300">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {filteredProducts.length ? (
                filteredProducts.map((product, index) => {
                  const imageContent = product.imageUrl ? (
                    <img
                      key="image"
                      src={product.imageUrl || PLACEHOLDER_PRODUCT_IMAGE}
                      alt={product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={handleImageError}
                    />
                  ) : (
                    <div key="fallback" className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-box text-gray-400" />
                    </div>
                  );

                  return (
                    <tr
                      key={product.id ?? `${product.name}-${index}`}
                      className={`hover:bg-gray-800/50 transition-colors ${index % 2 === 0 ? 'odd:bg-gray-800/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {imageContent}
                          <div>
                            <div className="text-white font-medium">{product.name}</div>
                            <div className="text-gray-400 text-sm">SKU: {product.sku || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {formatValue(product.baseUnitPrice)} <span className="text-xs text-gray-400">/ {product.baseUnitName}</span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          Cost: {formatValue(product.cost)} / {product.baseUnitName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{product.stock}</div>
                        {product.stock <= (product.reorderLevel ?? 10) ? (
                          <div className="text-red-400 text-xs">Low stock</div>
                        ) : null}
                        {product.stock <= 0 ? (
                          <div className="text-red-500 text-xs font-semibold">Out of stock</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300">
                          {product.category}
                        </span>
                      </td>
                      {canManageProducts ? (
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              onClick={() => openEditProductModal(product)}
                            >
                              <i className="fas fa-edit" />
                            </button>
                            <button
                              type="button"
                              className="text-red-400 hover:text-red-300 transition-colors"
                              onClick={() => openDeleteProductModal(product)}
                            >
                              <i className="fas fa-trash" />
                            </button>
                            <button
                              type="button"
                              className="text-yellow-400 hover:text-yellow-300 transition-colors"
                              title="Report Damage"
                              onClick={() => openReportDamageModal(product)}
                            >
                              <i className="fas fa-heart-broken" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-gray-400" colSpan={canManageProducts ? 5 : 4}>
                    <i className="fas fa-boxes text-3xl mb-3 opacity-50" />
                    <p>No products match this view yet.</p>
                    {canManageProducts ? (
                      <div className="mt-4 flex justify-center">
                        <button type="button" className="perplexity-button px-4 py-2 rounded-xl" onClick={openCreateProductModal}>
                          <i className="fas fa-plus mr-2" />Add Product
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}






