const Setting = require('../models/Setting');
const { GiftCategory, Gift, Emoji } = require('../models/Gift');
const { CoinPlan, CoinHistory } = require('../models/CoinPlan');
const { ReportReason } = require('../models/Report');
const { StoreItem } = require('../models/StoreItem');
const Song = require('../models/Song');
const Hashtag = require('../models/Hashtag');
const User = require('../models/User');

async function seedData() {
    console.log('🌱 Starting memory DB seeding...');

    // ─── Settings ──────────────────────────────────────
    const existing = await Setting.findOne({});
    if (!existing) {
        await Setting.create({
            currency: { name: 'Indian Rupee', symbol: '₹', countryCode: 'IN', currencyCode: 'INR', isDefault: true },
            isGooglePlayEnabled: true, isStripeEnabled: false, isRazorpayEnabled: false,
            loginBonus: 100, privateCallRate: 20, durationOfShorts: 30,
            minCoinsToCashOut: 500, minCoinsForPayout: 1000, pkEndTime: 60,
            privacyPolicyLink: 'https://example.com/privacy',
            termsOfUsePolicyLink: 'https://example.com/terms',
        });
        console.log('✅ Default settings created');
    }

    // ─── Gift Categories & Gifts ──────────────────────
    if (await GiftCategory.countDocuments() === 0) {
        const cats = await GiftCategory.insertMany([
            { name: 'Popular', sortOrder: 1 },
            { name: 'Luxury', sortOrder: 2 },
            { name: 'Romantic', sortOrder: 3 },
            { name: 'Fun', sortOrder: 4 },
            { name: 'VIP', sortOrder: 5 },
        ]);
        const gifts = [];
        const giftNames = [
            ['Rose', 'Heart', 'Star', 'Crown', 'Diamond'],
            ['Sports Car', 'Yacht', 'Private Jet', 'Castle', 'Galaxy'],
            ['Love Letter', 'Cupid', 'Kiss', 'Ring', 'Bouquet'],
            ['Fireworks', 'Confetti', 'Magic Wand', 'Party Hat', 'Balloon'],
            ['VIP Badge', 'Gold Trophy', 'Platinum Star', 'Royal Crown', 'Emperor Seal'],
        ];
        const giftCoins = [
            [10, 20, 50, 100, 200],
            [500, 1000, 2000, 5000, 10000],
            [15, 30, 60, 150, 300],
            [5, 15, 25, 50, 100],
            [1000, 2000, 5000, 10000, 50000],
        ];
        cats.forEach((cat, ci) => {
            giftNames[ci].forEach((name, gi) => {
                gifts.push({ giftCategoryId: cat._id, name, coin: giftCoins[ci][gi], giftType: 'static', sortOrder: gi + 1 });
            });
        });
        await Gift.insertMany(gifts);
        console.log('✅ Gift categories and gifts created');
    }

    // ─── Emojis ────────────────────────────────────────
    if (await Emoji.countDocuments() === 0) {
        const emojis = ['😀', '😍', '🥰', '😂', '🤣', '😎', '🔥', '💯', '❤️', '💎', '🎉', '👑', '✨', '🌟', '💪'].map(e => ({ name: e, image: e }));
        await Emoji.insertMany(emojis);
        console.log('✅ Emojis created');
    }

    // ─── Coin Plans ────────────────────────────────────
    if (await CoinPlan.countDocuments() === 0) {
        await CoinPlan.insertMany([
            { coin: 100, amount: 0.99 }, { coin: 500, amount: 4.99, isPopular: true },
            { coin: 1000, amount: 8.99 }, { coin: 2500, amount: 19.99 },
            { coin: 5000, amount: 39.99 }, { coin: 10000, amount: 74.99 },
        ]);
        console.log('✅ Coin plans created');
    }

    // ─── Report Reasons ───────────────────────────────
    if (await ReportReason.countDocuments() === 0) {
        await ReportReason.insertMany([
            { title: 'Spam or misleading' }, { title: 'Inappropriate content' },
            { title: 'Harassment or bullying' }, { title: 'Violence or harmful activities' },
            { title: 'Hate speech' }, { title: 'Impersonation' },
            { title: 'Underage user' }, { title: 'Other' },
        ]);
        console.log('✅ Report reasons created');
    }

    // ─── Store Items ──────────────────────────────────
    if (await StoreItem.countDocuments() === 0) {
        await StoreItem.insertMany([
            { name: 'Golden Frame', type: 'FRAME', coin: 200, frameType: 1 },
            { name: 'Diamond Frame', type: 'FRAME', coin: 500, frameType: 2 },
            { name: 'Royal Frame', type: 'FRAME', coin: 1000, frameType: 3 },
            { name: 'Neon Theme', type: 'THEME', coin: 300 },
            { name: 'Galaxy Theme', type: 'THEME', coin: 500 },
            { name: 'Premium Theme', type: 'THEME', coin: 800 },
            { name: 'Sports Car Ride', type: 'RIDE', coin: 1000, frameType: 1 },
            { name: 'Helicopter Ride', type: 'RIDE', coin: 2000, frameType: 2 },
            { name: 'Spaceship Ride', type: 'RIDE', coin: 5000, frameType: 3 },
        ]);
        console.log('✅ Store items created');
    }

    // ─── Songs ────────────────────────────────────────
    if (await Song.countDocuments() === 0) {
        await Song.insertMany([
            { songTitle: 'Summer Vibes', singerName: 'DJ Groove', duration: 30, songLink: 'https://example.com/summer-vibes.mp3' },
            { songTitle: 'Night Sky', singerName: 'Luna', duration: 25, songLink: 'https://example.com/night-sky.mp3' },
            { songTitle: 'Energy', singerName: 'Beat Master', duration: 30, songLink: 'https://example.com/energy.mp3' },
            { songTitle: 'Chill Wave', singerName: 'Ocean', duration: 20, songLink: 'https://example.com/chill-wave.mp3' },
            { songTitle: 'Fire Dance', singerName: 'Blaze', duration: 30, songLink: 'https://example.com/fire-dance.mp3' },
        ]);
        console.log('✅ Songs created');
    }

    // ─── Hashtags ─────────────────────────────────────
    if (await Hashtag.countDocuments() === 0) {
        await Hashtag.insertMany([
            { hashTag: '#trending', usageCount: 500 }, { hashTag: '#viral', usageCount: 400 },
            { hashTag: '#live', usageCount: 300 }, { hashTag: '#fun', usageCount: 250 },
            { hashTag: '#music', usageCount: 200 }, { hashTag: '#dance', usageCount: 180 },
            { hashTag: '#comedy', usageCount: 150 }, { hashTag: '#love', usageCount: 140 },
            { hashTag: '#gaming', usageCount: 120 }, { hashTag: '#food', usageCount: 100 },
        ]);
        console.log('✅ Hashtags created');
    }

    // ─── Dummy Users ──────────────────────────────────
    if (await User.countDocuments() === 0) {
        const dummyUsers = [
            { name: "Heheeh Hehe", userName: "heheehehehe", email: "heheeh297@gmail.com", gender: "Male", age: 25, country: "Turkey", isVIP: true, isOnline: false, role: 0, coin: 5000, uniqueId: "24410428", image: "https://ui-avatars.com/api/?name=Heheeh+Hehe&background=random" },
            { name: "Puremoney Pro", userName: "puremoneypro", email: "puremoney@gmail.com", gender: "Male", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "49802722", image: "https://ui-avatars.com/api/?name=Puremoney+Pro&background=random" },
            { name: "James Thomas", userName: "jamesthomas_0865", email: "james@gmail.com", gender: "Male", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "26103510", image: "https://ui-avatars.com/api/?name=James+Thomas&background=random" },
            { name: "Noah Brown", userName: "noahbrown_1959", email: "noah@gmail.com", gender: "Male", age: 18, country: "India", isVIP: true, isOnline: false, role: 0, coin: 5000, uniqueId: "94117823", image: "https://ui-avatars.com/api/?name=Noah+Brown&background=random" },
            { name: "Software Developer", userName: "softwaredeveloper", email: "dev@gmail.com", gender: "Male", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "56259805", totalFollowers: 1, totalFollowing: 1, totalFriends: 1, image: "https://ui-avatars.com/api/?name=Software+Dev&background=random" },
            { name: "Riley Evans", userName: "rileyevans_5843", email: "riley@gmail.com", gender: "Male", age: 30, country: "India", isVIP: true, isOnline: false, role: 0, coin: 5000, uniqueId: "20060889", image: "https://ui-avatars.com/api/?name=Riley+Evans&background=random" },
            { name: "MD ABDUR RAHMAN", userName: "mdabdurrahman", email: "md@gmail.com", gender: "Male", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "87215574", image: "https://ui-avatars.com/api/?name=MD+ABDUR&background=random" },
            { name: "Madison Rogers", userName: "madisonrogers_5245", email: "madison@gmail.com", gender: "Female", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "64602658", image: "https://ui-avatars.com/api/?name=Madison+Rogers&background=random" },
            { name: "Lillian Bell", userName: "lillianbell_3042", email: "lillian@gmail.com", gender: "Female", age: 18, country: "India", isVIP: false, isOnline: false, role: 0, coin: 0, uniqueId: "87066914", image: "https://ui-avatars.com/api/?name=Lillian+Bell&background=random" },
            { name: "Samuel Scott", userName: "samuelscott_0941", email: "samuel@gmail.com", gender: "Male", age: 18, country: "India", isVIP: true, isOnline: false, role: 0, coin: 5000, uniqueId: "05490919", image: "https://ui-avatars.com/api/?name=Samuel+Scott&background=random" },
            { name: "Agency Owner", userName: "agency_owner", email: "agency@tingle.com", gender: "Female", age: 28, country: "USA", isVIP: true, isOnline: true, role: 2, coin: 100000, uniqueId: "AG-1001", totalFriends: 5, image: "https://ui-avatars.com/api/?name=Agency+Owner&background=random" },
            { name: "Blocked User", userName: "bad_user", email: "block@tingle.com", gender: "Male", age: 22, country: "UK", isVIP: false, isOnline: false, role: 0, coin: 10, uniqueId: "BU-9999", isBlock: true, image: "https://ui-avatars.com/api/?name=Blocked+User&background=random" }
        ];

        const firstNames = ["Emily", "Michael", "Sarah", "David", "Jessica", "Daniel", "Lauren", "Matthew", "Ashley", "Christopher", "Amanda", "Joshua"];
        const lastNames = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"];

        for (let i = dummyUsers.length; i < 24; i++) {
            const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
            const isFemale = Math.random() > 0.5;
            const hasCoins = Math.random() > 0.7;
            const coins = hasCoins ? Math.floor(Math.random() * 50) * 100 : 0;

            dummyUsers.push({
                name: `${fname} ${lname}`,
                userName: `${fname.toLowerCase()}_${lname.toLowerCase()}_${Math.floor(Math.random() * 1000)}`,
                email: `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@example.com`,
                gender: isFemale ? "Female" : "Male",
                age: 18 + Math.floor(Math.random() * 30),
                country: ["USA", "India", "UK", "Canada", "Australia", "Turkey", "Germany"][Math.floor(Math.random() * 7)],
                isVIP: Math.random() > 0.8,
                isOnline: Math.random() > 0.8,
                role: 0,
                coin: coins,
                receivedCoins: hasCoins ? Math.floor(coins / 2) : 0,
                spentCoins: hasCoins ? Math.floor(coins / 4) : 0,
                uniqueId: Math.floor(10000000 + Math.random() * 90000000).toString(),
                totalFollowers: Math.floor(Math.random() * 100),
                totalFollowing: Math.floor(Math.random() * 50),
                image: `https://ui-avatars.com/api/?name=${fname}+${lname}&background=random`
            });
        }

        const insertedUsers = await User.insertMany(dummyUsers);
        console.log(`✅ ${insertedUsers.length} Dummy users created`);

        // Create some Coin History for the first VIP user
        const firstVip = insertedUsers.find(u => u.isVIP);
        if (firstVip) {
            await CoinHistory.insertMany([
                { userId: firstVip._id, type: 0, coin: 5000, title: "Login Bonus", isIncome: true },
                { userId: firstVip._id, type: 1, coin: 200, title: "Gift to Host", isIncome: false },
                { userId: firstVip._id, type: 2, coin: 1000, title: "Top Up", isIncome: true }
            ]);
            console.log('✅ Dummy coin history created');
        }

        // ─── Agencies & Hosts ──────────────────────────────
        const Agency = require('../models/Agency');
        if (await Agency.countDocuments() === 0) {
            // Pick two users to be agency owners (role=2) and some to be hosts
            const agencyOwner1 = insertedUsers[10]; // "Agency Owner"
            const agencyOwner2 = insertedUsers.find(u => u.gender === 'Female' && !u.isVIP) || insertedUsers[7];

            await User.findByIdAndUpdate(agencyOwner1._id, { role: 2 });
            await User.findByIdAndUpdate(agencyOwner2._id, { role: 2 });

            const vibeNestAgency = await Agency.create({
                ownerId: agencyOwner1._id,
                name: 'VibeNest Agency',
                image: `https://ui-avatars.com/api/?name=VibeNest&background=6366f1&color=fff&bold=true`,
                code: 'AG-VN-001',
                commissionRate: 25,
                status: 'Approved',
                contactEmail: 'hello@vibenest.com',
                mobile: '+447459663728',
                country: 'United Kingdom',
                description: 'Premier live streaming talent agency',
                totalHostEarnings: 27089,
                totalAgencyEarnings: 6772,
            });

            const demoAgency = await Agency.create({
                ownerId: agencyOwner2._id,
                name: 'Demo Agency',
                image: `https://ui-avatars.com/api/?name=Demo+Agency&background=a78bfa&color=fff&bold=true`,
                code: 'AG-DM-002',
                commissionRate: 10,
                status: 'Approved',
                contactEmail: 'john@gmail.com',
                mobile: '+919887654321',
                country: 'India',
                description: 'Demo agency for testing',
                totalHostEarnings: 3021,
                totalAgencyEarnings: 302,
            });

            // Make some users hosts, linked to agencies
            const hostCandidates = insertedUsers.filter(u => u.role === 0).slice(0, 6);
            for (let i = 0; i < hostCandidates.length; i++) {
                const agencyRef = i < 3 ? vibeNestAgency : demoAgency;
                await User.findByIdAndUpdate(hostCandidates[i]._id, {
                    isHost: true,
                    agencyId: agencyRef._id,
                    receivedCoins: Math.floor(Math.random() * 10000),
                    coin: Math.floor(Math.random() * 5000),
                    isVIP: i < 2,
                });
            }

            console.log('✅ Demo agencies and hosts created');
        }
    }

    console.log('🎉 Memory seed completed!');
}

module.exports = seedData;

