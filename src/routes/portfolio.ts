import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import type { PortfolioItem, PortfolioItemInput, PortfolioItemResponse } from '../types/portfolio.js';

const router = Router();

const PORTFOLIO_SELECT = `
  id,
  title,
  image_url,
  category_id,
  sort_order,
  is_published,
  created_at,
  updated_at,
  categories ( name )
`;

function toResponse(item: PortfolioItem): PortfolioItemResponse {
  const categoryName =
    item.categories?.name ??
    (Array.isArray(item.categories) ? item.categories[0]?.name : undefined) ??
    'Uncategorized';

  return {
    id: item.id,
    title: item.title,
    category: categoryName,
    categoryId: item.category_id,
    image: item.image_url,
    isPublished: item.is_published,
  };
}

// GET /api/portfolio/manage — all items for admin dashboard
router.get('/manage', requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(PORTFOLIO_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ items: (data as PortfolioItem[]).map(toResponse) });
  } catch (err) {
    console.error('GET /api/portfolio/manage error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio items' });
  }
});

// GET /api/portfolio/manage/:id — single item for admin (view/edit)
router.get('/manage/:id', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(PORTFOLIO_SELECT)
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      throw error;
    }

    res.json(toResponse(data as PortfolioItem));
  } catch (err) {
    console.error('GET /api/portfolio/manage/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio item' });
  }
});

async function resolveCategoryId(categoryName: string): Promise<string | null> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .eq('is_active', true)
    .single();

  return data?.id ?? null;
}

async function validateCategoryId(categoryId: string): Promise<boolean> {
  const { data } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('is_active', true)
    .single();

  return !!data;
}

// GET /api/portfolio — list published items (optional ?category=Sculpting)
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('portfolio_items')
      .select(PORTFOLIO_SELECT)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    const category = req.query.category as string | undefined;
    if (category && category !== 'All') {
      const categoryId = await resolveCategoryId(category);
      if (!categoryId) {
        return res.json({ items: [] });
      }
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      items: (data as PortfolioItem[]).map(toResponse),
    });
  } catch (err) {
    console.error('GET /api/portfolio error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio items' });
  }
});

// GET /api/portfolio/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select(PORTFOLIO_SELECT)
      .eq('id', req.params.id)
      .eq('is_published', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      throw error;
    }

    res.json(toResponse(data as PortfolioItem));
  } catch (err) {
    console.error('GET /api/portfolio/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio item' });
  }
});

// POST /api/portfolio — create (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body as PortfolioItemInput;

    if (!body.title?.trim() || !body.category_id || !body.image_url?.trim()) {
      return res.status(400).json({ error: 'title, category_id, and image_url are required' });
    }

    const valid = await validateCategoryId(body.category_id);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or inactive category_id' });
    }

    const { data, error } = await supabase
      .from('portfolio_items')
      .insert({
        title: body.title.trim(),
        category_id: body.category_id,
        image_url: body.image_url.trim(),
        is_published: body.is_published ?? true,
      })
      .select(PORTFOLIO_SELECT)
      .single();

    if (error) throw error;

    res.status(201).json(toResponse(data as PortfolioItem));
  } catch (err) {
    console.error('POST /api/portfolio error:', err);
    res.status(500).json({ error: 'Failed to create portfolio item' });
  }
});

// PUT /api/portfolio/:id — update (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const body = req.body as Partial<PortfolioItemInput>;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.category_id !== undefined) {
      const valid = await validateCategoryId(body.category_id);
      if (!valid) {
        return res.status(400).json({ error: 'Invalid or inactive category_id' });
      }
      updates.category_id = body.category_id;
    }
    if (body.image_url !== undefined) updates.image_url = body.image_url.trim();
    if (body.is_published !== undefined) updates.is_published = body.is_published;

    const { data, error } = await supabase
      .from('portfolio_items')
      .update(updates)
      .eq('id', req.params.id)
      .select(PORTFOLIO_SELECT)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Portfolio item not found' });
      }
      throw error;
    }

    res.json(toResponse(data as PortfolioItem));
  } catch (err) {
    console.error('PUT /api/portfolio/:id error:', err);
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// DELETE /api/portfolio/:id — delete (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/portfolio/:id error:', err);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

export default router;
