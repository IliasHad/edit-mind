import { z } from 'zod';

export const CollectionExportSchema = z.object({
  selectedSceneIds: z.array(z.string()).min(1, "At least one scene id is require").default([])
});
