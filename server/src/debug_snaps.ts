
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString } as any);
const prisma = new PrismaClient({ adapter });

async function getHistoryLocal(userId: string, range: '24h' | '1w' | '1m' = '24h') {
    let since = new Date();
    switch (range) {
        case '24h':
            since.setHours(since.getHours() - 24);
            break;
        case '1w':
            since.setDate(since.getDate() - 7);
            break;
        case '1m':
            since.setDate(since.getDate() - 30);
            break;
    }

    console.log(`Querying range ${range}, since: ${since.toISOString()}`);

    const rawHistory = await prisma.portfolioSnapshot.findMany({
        where: {
            userId,
            timestamp: { gte: since }
        },
        orderBy: { timestamp: 'desc' },
        take: 500
    });

    return rawHistory.reverse(); // Return oldest -> newest
}

async function main() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log("No user found");
            return;
        }
        console.log(`Testing getHistory for user: ${user.id}`);

        // Test 24h
        const h24 = await getHistoryLocal(user.id, '24h');
        console.log(`24h Data Points: ${h24.length}`);
        if (h24.length > 0) {
            const vals = h24.map((x: any) => x.totalValue);
            console.log(`24h Range: ${Math.min(...vals)} - ${Math.max(...vals)}`);
        }

        // Test 1w
        const h1w = await getHistoryLocal(user.id, '1w');
        console.log(`1w Data Points: ${h1w.length}`);
        if (h1w.length > 0) {
            const values = h1w.map((x: any) => x.totalValue);
            const min = Math.min(...values);
            const max = Math.max(...values);
            console.log(`1w Min: ${min}, Max: ${max}, Diff: ${max - min}`);

            // Print first few to see if they are identical
            console.log("First 5 snapshots of 1w:");
            console.table(h1w.slice(0, 5).map((s: any) => ({
                t: s.timestamp.toISOString(),
                val: s.totalValue
            })));
        } else {
            console.log("NO DATA for 1w");
        }

        // Test 1m
        const h1m = await getHistoryLocal(user.id, '1m');
        console.log(`1m Data Points: ${h1m.length}`);
        if (h1m.length > 0) {
            const values = h1m.map((x: any) => x.totalValue);
            const min = Math.min(...values);
            const max = Math.max(...values);
            console.log(`1m Min: ${min}, Max: ${max}, Diff: ${max - min}`);
        } else {
            console.log("NO DATA for 1m");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
