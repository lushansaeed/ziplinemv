export interface SlotAvailability {
  id:           string;
  startTime:    string;
  endTime:      string;
  label:        string;
  capacity:     number;
  booked:       number;
  remaining:    number;
  available:    number;
  status:       "available" | "full" | "blocked" | "closed";
  selectable:   boolean;
  canBook:      boolean;
  priceOverride?: number | null;
}
