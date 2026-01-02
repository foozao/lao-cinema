'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number | null;
  maxUses: number | null;
  usesCount: number;
  validFrom: string | null;
  validTo: string | null;
  movieId: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PromoCodesPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'free' as 'percentage' | 'fixed' | 'free',
    discountValue: '',
    maxUses: '',
    validFrom: '',
    validTo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/promo-codes`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load promo codes');
      }

      const data = await response.json();
      setPromoCodes(data.promoCodes);
    } catch (err) {
      console.error('Failed to load promo codes:', err);
      setError('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
      };

      if (formData.discountType !== 'free' && formData.discountValue) {
        payload.discountValue = parseInt(formData.discountValue);
      }

      if (formData.maxUses) {
        payload.maxUses = parseInt(formData.maxUses);
      }

      if (formData.validFrom) {
        payload.validFrom = new Date(formData.validFrom).toISOString();
      }

      if (formData.validTo) {
        payload.validTo = new Date(formData.validTo).toISOString();
      }

      const response = await fetch(`${API_BASE_URL}/admin/promo-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create promo code');
      }

      // Reset form and reload
      setFormData({
        code: '',
        discountType: 'free',
        discountValue: '',
        maxUses: '',
        validFrom: '',
        validTo: '',
      });
      setIsCreateOpen(false);
      await loadPromoCodes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update promo code');
      }

      await loadPromoCodes();
    } catch (err) {
      console.error('Failed to toggle promo code:', err);
      setError('Failed to update promo code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/promo-codes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete promo code');
      }

      await loadPromoCodes();
    } catch (err) {
      console.error('Failed to delete promo code:', err);
      setError('Failed to delete promo code');
    }
  };

  const formatDiscount = (code: PromoCode) => {
    switch (code.discountType) {
      case 'free':
        return 'Free (100%)';
      case 'percentage':
        return `${code.discountValue}%`;
      case 'fixed':
        return `${code.discountValue?.toLocaleString()} LAK`;
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading promo codes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('promoCodes')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('promoCodesDescription')}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('createPromoCode')}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {promoCodes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">{t('noPromoCodesYet')}</p>
          <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
            {t('createFirstPromoCode')}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{t('promoCode')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('promoDiscount')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('promoUses')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('promoValidPeriod')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('promoStatus')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('promoActions')}</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes.map((code) => (
                <tr key={code.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono font-semibold">{code.code}</td>
                  <td className="px-4 py-3">{formatDiscount(code)}</td>
                  <td className="px-4 py-3">
                    {code.usesCount}
                    {code.maxUses && ` / ${code.maxUses}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {code.validFrom || code.validTo ? (
                      <>
                        {code.validFrom && new Date(code.validFrom).toLocaleDateString()}
                        {code.validFrom && code.validTo && ' - '}
                        {code.validTo && new Date(code.validTo).toLocaleDateString()}
                      </>
                    ) : (
                      t('promoNoExpiration')
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(code.id, code.isActive)}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        code.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {code.isActive ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          {t('promoActive')}
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 mr-1" />
                          {t('promoInactive')}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(code.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a new promotional discount code for movie rentals
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="FREEMOVIE"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Will be converted to uppercase
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (100% off)</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (LAK)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.discountType !== 'free' && (
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === 'percentage'
                    ? 'Percentage *'
                    : 'Amount (LAK) *'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  placeholder={formData.discountType === 'percentage' ? '50' : '20000'}
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: e.target.value })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="Unlimited"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">Valid From (optional)</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, validFrom: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validTo">Valid To (optional)</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo}
                  onChange={(e) =>
                    setFormData({ ...formData, validTo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !formData.code}>
              {submitting ? 'Creating...' : 'Create Promo Code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
