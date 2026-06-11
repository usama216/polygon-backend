export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
}

export interface CategoryInput {
  name: string;
  is_active?: boolean;
}
