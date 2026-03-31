const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
    console.log('Seeding database...');

    const users = [
        { email: 'admin@cha.com', password: 'admin123', name: 'Admin User', role: 'ADMIN' },
        { email: 'staff@cha.com', password: 'staff123', name: 'Staff User', role: 'OPERATION_STAFF' },
        { email: 'viewer@cha.com', password: 'viewer123', name: 'Viewer User', role: 'VIEWER' },
    ];

    for (const u of users) {
        const hashed = await bcrypt.hash(u.password, 10);
        await prisma.user.upsert({
            where: { email: u.email },
            update: { password: hashed, name: u.name, role: u.role },
            create: { email: u.email, password: hashed, name: u.name, role: u.role },
        });
        console.log(`  ✓ User created: ${u.email} (${u.role})`);
    }

    console.log('Seeding complete!');
}

seed()
    .catch((e) => {
        console.error('Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
