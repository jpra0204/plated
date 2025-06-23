// types/suggestion.ts
export interface Suggestion {
    /** Unique identifier from your database or third‐party API */
    id: string  
  
    /** Human‐readable name, e.g. “Almond Milk” */
    product_name: string  
  
    /** URL to a thumbnail image */
    image_front_small_url: string  
  }