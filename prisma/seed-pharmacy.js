// Seeds pharmacy categories and ~40 common medicines (with brand variants + batches).
// Same generic (e.g. Paracetamol 500mg) can appear under multiple brandNames;
// the POS groups them via `genericName` when the cashier searches.
//
// Safe to re-run: products are upserted by SKU, and existing branch stock is
// left untouched so re-seeding never overwrites real stock levels.
// A few items are deliberately low-stock or near-expiry so the dashboard
// alerts have something to show.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CATEGORIES = {
  pain: ["Pain & Fever", "Painkillers and fever reducers"],
  antibiotics: ["Antibiotics", "Prescription antibacterial medicines"],
  malaria: ["Antimalarials", "Malaria treatment"],
  allergy: ["Allergy, Cough & Cold", "Antihistamines, cough syrups and lozenges"],
  digestive: ["Digestive Health", "Antacids, rehydration and stomach medicines"],
  vitamins: ["Vitamins & Supplements", "Vitamins, minerals and supplements"],
  chronic: ["Chronic Care", "Diabetes, blood pressure and asthma medicines"],
  skin: ["Skin Care & First Aid", "Creams, ointments and antiseptics"],
  eye: ["Eye & Ear Care", "Eye and ear drops"],
};

// m(category, sku, name, generic, brand, strength, form, pack, maker, rx, cost, price, qty, expiryMonths?)
const m = (category, sku, name, genericName, brandName, strength, dosageForm, packSize, manufacturer,
  prescriptionRequired, costPrice, sellingPrice, quantity, expiryMonths = 12) => ({
  category, sku, name, genericName, brandName, strength, dosageForm, packSize, manufacturer,
  prescriptionRequired, costPrice, sellingPrice, quantity, expiryMonths,
});

const MEDICINES = [
  // Pain & Fever
  m("pain", "MED-PARA500-PAN-20", "Panadol 500mg (20 tabs)", "Paracetamol 500mg", "Panadol", "500mg", "tablet", "20 tabs", "GSK", false, 90, 120, 50),
  m("pain", "MED-PARA500-HED-20", "Hedex 500mg (20 tabs)", "Paracetamol 500mg", "Hedex", "500mg", "tablet", "20 tabs", "GSK", false, 85, 110, 50),
  m("pain", "MED-PARA500-GEN-100", "Paracetamol 500mg Generic (100 tabs)", "Paracetamol 500mg", "Generic", "500mg", "tablet", "100 tabs", "Cosmos", false, 150, 220, 40),
  m("pain", "MED-PARAEXT-PAN-20", "Panadol Extra (20 tabs)", "Paracetamol 500mg + Caffeine 65mg", "Panadol", "500mg/65mg", "tablet", "20 tabs", "GSK", false, 130, 180, 40),
  m("pain", "MED-PARA120-CAL-100ML", "Calpol 120mg/5ml Syrup (100ml)", "Paracetamol 120mg/5ml", "Calpol", "120mg/5ml", "syrup", "100ml", "GSK", false, 180, 250, 30, 2),
  m("pain", "MED-IBU400-BRU-20", "Brufen 400mg (20 tabs)", "Ibuprofen 400mg", "Brufen", "400mg", "tablet", "20 tabs", "Abbott", false, 130, 180, 40),
  m("pain", "MED-IBU400-GEN-100", "Ibuprofen 400mg Generic (100 tabs)", "Ibuprofen 400mg", "Generic", "400mg", "tablet", "100 tabs", "Cosmos", false, 200, 300, 30),
  m("pain", "MED-DICLO50-GEN-100", "Diclofenac 50mg Generic (100 tabs)", "Diclofenac Sodium 50mg", "Generic", "50mg", "tablet", "100 tabs", "Cosmos", false, 150, 250, 30),

  // Antibiotics
  m("antibiotics", "MED-AMOX500-AMO-21", "Amoxil 500mg (21 caps)", "Amoxicillin 500mg", "Amoxil", "500mg", "capsule", "21 caps", "GSK", true, 350, 500, 25),
  m("antibiotics", "MED-AMOX500-GEN-100", "Amoxicillin 500mg Generic (100 caps)", "Amoxicillin 500mg", "Generic", "500mg", "capsule", "100 caps", "Cosmos", true, 600, 900, 20),
  m("antibiotics", "MED-AMOX125-GEN-100ML", "Amoxicillin 125mg/5ml Suspension (100ml)", "Amoxicillin 125mg/5ml", "Generic", "125mg/5ml", "suspension", "100ml", "Cosmos", true, 90, 150, 25, 2),
  m("antibiotics", "MED-COAMOX625-AUG-14", "Augmentin 625mg (14 tabs)", "Amoxicillin + Clavulanic Acid 625mg", "Augmentin", "625mg", "tablet", "14 tabs", "GSK", true, 900, 1250, 8),
  m("antibiotics", "MED-CIPRO500-GEN-10", "Ciprofloxacin 500mg Generic (10 tabs)", "Ciprofloxacin 500mg", "Generic", "500mg", "tablet", "10 tabs", "Cosmos", true, 80, 150, 30),
  m("antibiotics", "MED-AZI500-GEN-3", "Azithromycin 500mg Generic (3 tabs)", "Azithromycin 500mg", "Generic", "500mg", "tablet", "3 tabs", "Cosmos", true, 120, 250, 30),
  m("antibiotics", "MED-METRO400-FLA-21", "Flagyl 400mg (21 tabs)", "Metronidazole 400mg", "Flagyl", "400mg", "tablet", "21 tabs", "Sanofi", true, 150, 220, 30),

  // Antimalarials
  m("malaria", "MED-AL20120-COA-24", "Coartem 20/120mg (24 tabs)", "Artemether + Lumefantrine 20/120mg", "Coartem", "20/120mg", "tablet", "24 tabs", "Novartis", true, 450, 650, 20),
  m("malaria", "MED-AL20120-GEN-24", "Artemether/Lumefantrine Generic (24 tabs)", "Artemether + Lumefantrine 20/120mg", "Generic", "20/120mg", "tablet", "24 tabs", "Cosmos", true, 150, 300, 30),

  // Allergy, Cough & Cold
  m("allergy", "MED-LOR10-CLA-10", "Claritin 10mg (10 tabs)", "Loratadine 10mg", "Claritin", "10mg", "tablet", "10 tabs", "Bayer", false, 200, 280, 30),
  m("allergy", "MED-CET10-GEN-10", "Cetirizine 10mg Generic (10 tabs)", "Cetirizine 10mg", "Generic", "10mg", "tablet", "10 tabs", "Cosmos", false, 20, 50, 60),
  m("allergy", "MED-CPM4-PIR-30", "Piriton 4mg (30 tabs)", "Chlorphenamine 4mg", "Piriton", "4mg", "tablet", "30 tabs", "GSK", false, 60, 100, 40),
  m("allergy", "MED-DXM-BEN-100ML", "Benylin Dry Cough Syrup (100ml)", "Dextromethorphan", "Benylin", null, "syrup", "100ml", "Kenvue", false, 350, 480, 20),
  m("allergy", "MED-LOZ-STR-24", "Strepsils Original (24 lozenges)", "Amylmetacresol + Dichlorobenzyl Alcohol", "Strepsils", null, "other", "24 lozenges", "Reckitt", false, 250, 350, 30),

  // Digestive Health
  m("digestive", "MED-ORS-GEN-SACH", "ORS Sachet", "Oral Rehydration Salts", "Generic", null, "sachet", "1 sachet (20.5g)", "Cosmos", false, 15, 30, 200),
  m("digestive", "MED-ZINC20-GEN-10", "Zinc Sulphate 20mg Dispersible (10 tabs)", "Zinc Sulphate 20mg", "Generic", "20mg", "tablet", "10 tabs", "Cosmos", false, 50, 100, 50),
  m("digestive", "MED-ALG-GAV-150ML", "Gaviscon Liquid (150ml)", "Sodium Alginate + Sodium Bicarbonate", "Gaviscon", null, "suspension", "150ml", "Reckitt", false, 450, 600, 20),
  m("digestive", "MED-OME20-GEN-28", "Omeprazole 20mg Generic (28 caps)", "Omeprazole 20mg", "Generic", "20mg", "capsule", "28 caps", "Cosmos", false, 100, 200, 40),
  m("digestive", "MED-LOP2-GEN-10", "Loperamide 2mg Generic (10 caps)", "Loperamide 2mg", "Generic", "2mg", "capsule", "10 caps", "Cosmos", false, 30, 60, 40),
  m("digestive", "MED-HYO10-BUS-20", "Buscopan 10mg (20 tabs)", "Hyoscine Butylbromide 10mg", "Buscopan", "10mg", "tablet", "20 tabs", "Sanofi", false, 300, 420, 25),

  // Vitamins & Supplements
  m("vitamins", "MED-VITC1000-RED-10", "Redoxon Vitamin C 1000mg Effervescent (10 tabs)", "Ascorbic Acid 1000mg", "Redoxon", "1000mg", "tablet", "10 tabs", "Bayer", false, 450, 650, 25),
  m("vitamins", "MED-MULTI-GEN-30", "Multivitamin Tablets Generic (30 tabs)", "Multivitamin", "Generic", null, "tablet", "30 tabs", "Cosmos", false, 200, 350, 30),
  m("vitamins", "MED-FOLIC5-GEN-100", "Folic Acid 5mg Generic (100 tabs)", "Folic Acid 5mg", "Generic", "5mg", "tablet", "100 tabs", "Cosmos", false, 80, 150, 30),
  m("vitamins", "MED-FESO4-GEN-100", "Ferrous Sulphate 200mg Generic (100 tabs)", "Ferrous Sulphate 200mg", "Generic", "200mg", "tablet", "100 tabs", "Cosmos", false, 100, 180, 30),

  // Chronic Care
  m("chronic", "MED-MET500-GEN-100", "Metformin 500mg Generic (100 tabs)", "Metformin 500mg", "Generic", "500mg", "tablet", "100 tabs", "Cosmos", true, 200, 350, 30),
  m("chronic", "MED-AML5-GEN-30", "Amlodipine 5mg Generic (30 tabs)", "Amlodipine 5mg", "Generic", "5mg", "tablet", "30 tabs", "Cosmos", true, 100, 200, 30),
  m("chronic", "MED-LOS50-GEN-30", "Losartan 50mg Generic (30 tabs)", "Losartan Potassium 50mg", "Generic", "50mg", "tablet", "30 tabs", "Cosmos", true, 200, 350, 30),
  m("chronic", "MED-SAL100-VEN-200", "Ventolin Inhaler 100mcg (200 doses)", "Salbutamol 100mcg", "Ventolin", "100mcg", "inhaler", "200 doses", "GSK", true, 450, 650, 6),

  // Skin Care & First Aid
  m("skin", "MED-HC1-GEN-15G", "Hydrocortisone 1% Cream (15g)", "Hydrocortisone 1%", "Generic", "1%", "cream", "15g", "Cosmos", false, 80, 150, 30),
  m("skin", "MED-CLOT1-CAN-20G", "Canesten 1% Cream (20g)", "Clotrimazole 1%", "Canesten", "1%", "cream", "20g", "Bayer", false, 250, 350, 25),
  m("skin", "MED-PVPI10-BET-100ML", "Betadine Antiseptic Solution (100ml)", "Povidone-Iodine 10%", "Betadine", "10%", "other", "100ml", "Mundipharma", false, 300, 450, 20),
  m("skin", "MED-MSAL-DHT-35G", "Deep Heat Rub (35g)", "Methyl Salicylate + Menthol", "Deep Heat", null, "cream", "35g", "Mentholatum", false, 300, 420, 20),

  // Eye & Ear Care
  m("eye", "MED-CHLOR05-GEN-10ML", "Chloramphenicol 0.5% Eye Drops (10ml)", "Chloramphenicol 0.5%", "Generic", "0.5%", "drops", "10ml", "Cosmos", true, 80, 150, 25),
];

async function main() {
  const branch = await prisma.branch.findFirst({ where: { isMain: true } });
  if (!branch) throw new Error("No main branch found. Run `pnpm seed` first.");

  const categoryIds = {};
  for (const [key, [name, description]] of Object.entries(CATEGORIES)) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description },
    });
    categoryIds[key] = category.id;
  }

  for (const med of MEDICINES) {
    const { category, quantity, expiryMonths, ...productData } = med;
    const categoryId = categoryIds[category];

    const product = await prisma.product.upsert({
      where: { sku: med.sku },
      update: { ...productData, categoryId },
      create: {
        ...productData,
        categoryId,
        quantityInStock: quantity,
        totalCost: (med.costPrice || 0) * quantity,
        reorderLevel: 10,
      },
    });

    await prisma.productBranchStock.upsert({
      where: { productId_branchId: { productId: product.id, branchId: branch.id } },
      update: {},
      create: {
        productId: product.id,
        branchId: branch.id,
        quantityInStock: quantity,
        initialAllocation: quantity,
      },
    });

    const batchNumber = `${med.sku}-B1`;
    const existingBatch = await prisma.productBatch.findFirst({
      where: { productId: product.id, branchId: branch.id, batchNumber },
    });
    if (!existingBatch) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
      await prisma.productBatch.create({
        data: {
          productId: product.id,
          branchId: branch.id,
          batchNumber,
          expiryDate,
          quantity,
          costPrice: med.costPrice,
          receivedAt: new Date(),
        },
      });
    }

    console.log(`Seeded: ${med.name}`);
  }

  console.log(
    `\nPharmacy seed complete: ${MEDICINES.length} medicines across ${Object.keys(CATEGORIES).length} categories.`
  );
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { MEDICINES, CATEGORIES };
