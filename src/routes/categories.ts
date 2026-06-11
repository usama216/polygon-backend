import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import type { Category, CategoryInput, CategoryResponse } from '../types/category.js';

const router = Router();

function toResponse(cat: Category): CategoryResponse {
  return {
    id: cat.id,
    name: cat.name,
  };
}

// GET /api/categories — active categories (filters + admin dropdown)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      categories: (data as Category[]).map(toResponse),
    });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories — add category (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body as CategoryInput;

    if (!body.name?.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: body.name.trim(),
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Category already exists' });
      }
      throw error;
    }

    res.status(201).json(toResponse(data as Category));
  } catch (err) {
    console.error('POST /api/categories error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id — update category (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<CategoryInput>;
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      updates.name = body.name.trim();
    }
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Category not found' });
      }
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Category name already exists' });
      }
      throw error;
    }

    res.json(toResponse(data as Category));
  } catch (err) {
    console.error('PUT /api/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id — remove category (admin, only if unused)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { count, error: countError } = await supabase
      .from('portfolio_items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', req.params.id);

    if (countError) throw countError;

    if (count && count > 0) {
      return res.status(409).json({
        error: 'Cannot delete category that has portfolio items. Reassign or delete items first.',
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/categories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
