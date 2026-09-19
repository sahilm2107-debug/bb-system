const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // --- Master admin account (Member ID 005) -----------------------------
  const passwordHash = await bcrypt.hash("MalekAdmin1978@", 12);

  await prisma.user.upsert({
    where: { memberId: "005" },
    update: {},
    create: {
      memberId: "005",
      name: "Sahil Malek",
      username: "sahil.malek",
      passwordHash,
      role: "admin",
    },
  });

  console.log("✔ Master admin ready — username: sahil.malek, Member ID: 005");
  console.log("  Password: MalekAdmin1978@  (change this after first login)");

  // --- A couple of sample tasks so the dashboard isn't empty -------------
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: [
        { title: "Confirm delivery slot with Rossouw Carpentry", description: "Check gate access for the 3-ton truck." },
        { title: "Follow up on Masonite reorder", description: "Supplier quoted 4-day lead time." },
        { title: "Review WhatsApp escalations from the weekend", description: "3 messages flagged Saturday." },
      ],
    });
  }

  // --- Sample inventory so search/filter has something to show -----------
  const itemCount = await prisma.inventoryItem.count();
  if (itemCount === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        { tagNumber: "BRD-0001", name: "White Gloss 16mm", database: "boards", category: "Gloss", quantity: 24, unit: "sheet", price: 899 },
        { tagNumber: "BRD-0002", name: "Alpine Oak Texture 16mm", database: "boards", category: "Texture/Alpine", quantity: 18, unit: "sheet", price: 949 },
        { tagNumber: "BRD-0003", name: "Grey Granite 600mm Top", database: "boards", category: "600mm tops", quantity: 12, unit: "sheet", price: 1250 },
        { tagNumber: "BRD-0004", name: "Black Granite 900mm Top", database: "boards", category: "900mm tops", quantity: 9, unit: "sheet", price: 1550 },
        { tagNumber: "BRD-0005", name: "White Masonite 3mm", database: "boards", category: "Masonite", quantity: 40, unit: "sheet", price: 210 },
        { tagNumber: "HW-0001", name: "Brushed Steel D-Handle 128mm", database: "hardware", category: "Handles", quantity: 300, unit: "each", price: 22 },
        { tagNumber: "HW-0002", name: "Chipboard Screws 4x40mm (box)", database: "hardware", category: "Screws", quantity: 60, unit: "box", price: 65 },
        { tagNumber: "HW-0003", name: "White Wall Cladding Panel", database: "hardware", category: "Wall Claddings/Panels", quantity: 15, unit: "panel", price: 340 },
        { tagNumber: "HW-0004", name: "Stainless Steel Single Bowl Sink", database: "hardware", category: "Sinks", quantity: 7, unit: "each", price: 1100 },
        { tagNumber: "HW-0005", name: "Concealed Hinge 35mm", database: "hardware", category: "Hinges", quantity: 220, unit: "each", price: 14 },
      ],
    });
  }

  // --- Sample WhatsApp queue so the automation tab has something live ----
  const msgCount = await prisma.whatsAppMessage.count();
  if (msgCount === 0) {
    await prisma.whatsAppMessage.createMany({
      data: [
        { fromNumber: "+27 82 555 0134", fromName: "Pieter (carpenter)", body: "Good morning, need a quote for 3x 600mm granite tops, all round edging", status: "unanswered" },
        { fromNumber: "+27 71 222 9981", fromName: "Boitumelo", body: "Do you have white gloss 16mm in stock?", status: "answered", answeredAt: new Date() },
      ],
    });
  }

  // --- Sample employees so the Employee Summary page isn't empty --------
  const employeeCount = await prisma.employee.count();
  if (employeeCount === 0) {
    await prisma.employee.createMany({
      data: [
        { employeeCode: "EMP-01", name: "Thabo Nkosi", role: "Cutter" },
        { employeeCode: "EMP-02", name: "Johan van Wyk", role: "Edger" },
        { employeeCode: "EMP-03", name: "Sipho Dlamini", role: "General" },
      ],
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
