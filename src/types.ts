export type MetaNode = {
  assigned: boolean;
  value: boolean;
  explicit: boolean;
  children: Record<string, MetaNode>;
};
