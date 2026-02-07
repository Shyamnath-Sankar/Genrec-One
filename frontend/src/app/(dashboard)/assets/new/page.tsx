'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AssetCategory = {
  id: string
  name: string
  code: string
}

export default function NewAssetPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    asset_tag: '',
    serial_number: '',
    make: '',
    model: '',
    purchase_date: '',
    purchase_price: '',
    warranty_end_date: '',
    location: '',
    notes: '',
  })
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    code: '',
    description: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchCategories()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const result = await apiClient.get<AssetCategory[]>('/assets/categories')
      setCategories(Array.isArray(result) ? result : [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.code) {
      toast.error('Please enter category name and code')
      return
    }
    
    try {
      setIsSubmitting(true)
      const result = await apiClient.post<{ id: string }>('/assets/categories', newCategory)
      toast.success('Category created successfully')
      setFormData({ ...formData, category_id: result.id })
      setShowNewCategory(false)
      setNewCategory({ name: '', code: '', description: '' })
      await fetchCategories()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category_id || !formData.name || !formData.asset_tag) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setIsSubmitting(true)
      await apiClient.post('/assets', {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        purchase_date: formData.purchase_date || null,
        warranty_end_date: formData.warranty_end_date || null,
      })
      toast.success('Asset created successfully')
      router.push('/assets')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create asset')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (!hasPermission('assets.manage', 'create')) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to add assets</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Add New Asset</h1>
            <p className="text-muted-foreground">Register a new asset in the system</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
              <CardDescription>Enter the details of the new asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setShowNewCategory(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      New
                    </Button>
                  </div>
                ) : (
                  <Card className="p-4 space-y-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category Name *</Label>
                        <Input
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="e.g., Laptop"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Code *</Label>
                        <Input
                          value={newCategory.code}
                          onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}
                          placeholder="e.g., LAP"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" onClick={handleCreateCategory} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Create Category
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowNewCategory(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., MacBook Pro 16"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset_tag">Asset Tag *</Label>
                  <Input
                    id="asset_tag"
                    value={formData.asset_tag}
                    onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value.toUpperCase() })}
                    placeholder="e.g., AST-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Manufacturer serial number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Office A, Floor 3"
                  />
                </div>
              </div>

              {/* Make & Model */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make/Brand</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Apple, Dell, HP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., MacBook Pro 16 M3"
                  />
                </div>
              </div>

              {/* Purchase Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_end_date">Warranty End</Label>
                  <Input
                    id="warranty_end_date"
                    type="date"
                    value={formData.warranty_end_date}
                    onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this asset"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Asset
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
