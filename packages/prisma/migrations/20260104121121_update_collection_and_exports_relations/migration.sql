-- CreateTable
CREATE TABLE "_CollectionToExport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CollectionToExport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CollectionToExport_B_index" ON "_CollectionToExport"("B");

-- AddForeignKey
ALTER TABLE "_CollectionToExport" ADD CONSTRAINT "_CollectionToExport_A_fkey" FOREIGN KEY ("A") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionToExport" ADD CONSTRAINT "_CollectionToExport_B_fkey" FOREIGN KEY ("B") REFERENCES "Export"("id") ON DELETE CASCADE ON UPDATE CASCADE;
