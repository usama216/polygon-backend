export interface PortfolioItem {
  id: string;
  title: string;
  image_url: string;
  category_id: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
}

export interface PortfolioItemInput {
  title?: string;
  category_id?: string;
  image_url?: string;
  is_published?: boolean;
}

export interface PortfolioItemResponse {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  image: string;
  isPublished: boolean;
}
