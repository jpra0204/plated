export interface PantryItemType {
  /** The MongoDB ObjectId string */
  _id: string;

  /** The “raw” text the user entered, e.g. “2 bananas” */
  name: string;

  /** Parsed out number, e.g. `2` */
  quantity: number;

  /** Parsed unit, e.g. “bananas” or default “unitless” */
  unit: string;

  /** ISO date string when it was added */
  createdAt: string;
}
export type NewPantryItem = Omit<PantryItemType, "_id" | "createdAt">