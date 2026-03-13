export type TaskFieldType = "text" | "textarea" | "select" | "number" | "checkbox";

export type TaskFieldSchema = {
  name: string;          // key sent in additional_data JSON
  label: string;         // UI display label
  type: TaskFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];    // only for type "select"
};
