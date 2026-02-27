const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const { GiftCategory, Gift, Emoji } = require('../models/Gift');
const { CoinPlan, CoinHistory } = require('../models/CoinPlan');
const { StoreItem } = require('../models/StoreItem');
const { Report, ReportReason } = require('../models/Report');
const Help = require('../models/Help');
const Song = require('../models/Song');
const Hashtag = require('../models/Hashtag');
const LiveHistory = require('../models/LiveHistory');
const Setting = require('../models/Setting');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const HostApplication = require('../models/HostApplication');
const VipPlan = require('../models/VipPlan');
const Agency = require('../models/Agency');
const { upload, uploadToCloudinary } = require('../middleware/upload');

// Admin auth middleware
function adminAuth(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.redirect('/admin/login');
}

// ─── Login ──────────────────────────────────────────
router.get('/login', (req, res) => {
    res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    }
    res.render('admin/login', { error: 'Invalid credentials' });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// ─── Dashboard ──────────────────────────────────────
router.get('/', adminAuth, async (req, res) => {
    const [
        totalUsers, totalPosts, totalVideos, totalLiveActive, totalReports, totalRevenue,
        blockedUsers, recentUsers, topContributors, topEarningHosts,
        vipUsers, reportedUsers,
        totalHosts, blockedHosts,
        totalAgencies, blockedAgencies,
        reportedPosts, reportedVideos, topLikersAgg, topPerformingAgencies
    ] = await Promise.all([
        User.countDocuments(), Post.countDocuments(), Video.countDocuments(),
        LiveHistory.countDocuments({ isActive: true }),
        Report.countDocuments({ status: 0 }),
        CoinHistory.aggregate([{ $match: { type: 0 } }, { $group: { _id: null, total: { $sum: '$coin' } } }]).then(r => r[0]?.total || 0),
        User.countDocuments({ isBlock: true }),
        User.find().sort({ createdAt: -1 }).limit(5).lean(),
        User.find().sort({ coin: -1 }).limit(3).lean(),
        User.find({ receivedCoins: { $gt: 0 } }).sort({ receivedCoins: -1 }).limit(3).lean(),

        // Exact metrics for VIP, agencies, reports, etc.
        User.countDocuments({ isVIP: true }),
        Report.countDocuments({ status: 0, type: 'user' }),
        User.countDocuments({ receivedCoins: { $gt: 0 } }), // Treating host as user with received coins
        User.countDocuments({ isBlock: true, receivedCoins: { $gt: 0 } }),
        User.countDocuments({ role: 2 }), // 2 = agency
        User.countDocuments({ role: 2, isBlock: true }),
        Report.countDocuments({ status: 0, type: 'post' }),
        Report.countDocuments({ status: 0, type: 'video' }),
        Like.aggregate([
            { $group: { _id: "$userId", likes: { $sum: 1 } } },
            { $sort: { likes: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' }
        ]),
        User.find({ role: 2 }).sort({ coin: -1 }).limit(3).lean()
    ]);

    // Format top likers cleanly
    const topLikers = topLikersAgg.map(l => ({
        _id: l._id,
        name: l.user.name,
        image: l.user.image,
        userName: l.user.userName,
        likes: l.likes
    }));

    // Format top agencies
    const formattedAgencies = topPerformingAgencies.map(a => ({
        _id: a._id,
        name: a.name || 'Agency',
        image: a.image,
        userName: a.uniqueId || '-',
        coins: a.coin || 0,
        hosts: a.totalFriends || 0, // Using totalFriends as a mock for hosts managed
        commission: '10%'
    }));

    const chartData = {
        labels: ['Feb 3', 'Feb 4', 'Feb 25', 'Jun 22', 'Jul 11', 'Aug 13', 'Nov 4', 'Nov 10', 'Nov 11', 'Nov 13'],
        users: [3, 2, 22, 8, 4, 10, 0, 2, 2, 1],
        posts: [0, 0, 0, 1, 10, 0, 0, 1, 1, 0],
        videos: [0, 0, 0, 1, 4, 10, 0, 1, 2, 1],
        userReports: [0, 0, 0, 0, 2, 4, 0, 0, 0, 0],
        postReports: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    res.render('admin/dashboard', {
        totalUsers, totalPosts, totalVideos, totalLiveActive, totalReports, totalRevenue,
        blockedUsers, vipUsers, reportedUsers, totalHosts, blockedHosts, totalAgencies,
        blockedAgencies, reportedPosts, reportedVideos,
        recentUsers, topContributors, topEarningHosts, topLikers,
        topPerformingAgencies: formattedAgencies, chartData,
        pageTitle: 'Dashboard', page: 'dashboard'
    });
});

// ─── User Management ────────────────────────────────
router.get('/users', adminAuth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || '';
    const filterUserType = req.query.userType || '';
    const filterStatus = req.query.status || '';
    const filterRole = req.query.role || '';

    // Advanced Stats for Top Cards
    const [totalUsersCount, malesCount, femalesCount, vipUsersCount] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ gender: 'Male' }),
        User.countDocuments({ gender: 'Female' }),
        User.countDocuments({ isVIP: true })
    ]);

    // Build Match Query for Filtering
    let matchQuery = {};
    let orConditions = [];

    if (search) {
        orConditions.push(
            { name: { $regex: search, $options: 'i' } },
            { userName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { uniqueId: { $regex: search, $options: 'i' } }
        );
    }

    if (orConditions.length > 0) {
        matchQuery.$or = orConditions;
    }

    if (filterUserType === 'Real Users') {
        matchQuery.isFake = false;
    } else if (filterUserType === 'Fake Users') {
        matchQuery.isFake = true;
    }

    if (filterStatus === 'Blocked') {
        matchQuery.isBlock = true;
    } else if (filterStatus === 'Active') {
        matchQuery.isBlock = false;
    }

    if (filterRole === 'Agency') {
        matchQuery.role = 2;
    } else if (filterRole === 'Admin') {
        matchQuery.role = 1;
    } else if (filterRole === 'User') {
        matchQuery.role = 0;
    }

    // Advanced Aggregation to bring in posts/videos counts cleanly
    const aggregatePipeline = [
        { $match: matchQuery },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
            $lookup: {
                from: 'posts',
                localField: '_id',
                foreignField: 'userId',
                as: 'userPosts'
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: '_id',
                foreignField: 'userId',
                as: 'userVideos'
            }
        },
        {
            $addFields: {
                totalPosts: { $size: "$userPosts" },
                totalVideos: { $size: "$userVideos" }
            }
        },
        {
            $project: {
                userPosts: 0,
                userVideos: 0
            }
        }
    ];

    const [users, total] = await Promise.all([
        User.aggregate(aggregatePipeline),
        User.countDocuments(matchQuery)
    ]);

    res.render('admin/users', {
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
        search,
        filterUserType,
        filterStatus,
        filterRole,
        stats: {
            totalUsersCount,
            malesCount,
            femalesCount,
            vipUsersCount
        },
        pageTitle: 'Users'
    });
});

router.get('/users/:id', adminAuth, async (req, res) => {
    try {
        const { Visitor } = require('../models/Visitor');
        const user = await User.findById(req.params.id).lean();
        if (!user) return res.redirect('/admin/users');

        const uid = user._id;

        // Fetch all user activity data in parallel
        const [
            history,
            videos,
            posts,
            liveSessions,
            pkBattles,
            followers,
            following,
            visitors
        ] = await Promise.all([
            CoinHistory.find({ userId: uid }).sort({ createdAt: -1 }).limit(50).lean(),
            Video.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean(),
            Post.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean(),
            LiveHistory.find({ userId: uid, liveType: { $ne: 3 } }).sort({ createdAt: -1 }).limit(10).lean(),
            LiveHistory.find({ userId: uid, $or: [{ liveType: 3 }, { isPkMode: true }] }).sort({ createdAt: -1 }).limit(10).lean(),
            Follow.find({ followingId: uid }).populate('userId', 'name userName image isOnline isVIP').limit(30).lean(),
            Follow.find({ userId: uid }).populate('followingId', 'name userName image isOnline isVIP').limit(30).lean(),
            Visitor.find({ userId: uid }).populate('visitorId', 'name userName image isOnline').limit(30).sort({ createdAt: -1 }).lean()
        ]);

        // Coin stats
        let totalIncome = 0, totalOutgoing = 0, loginBonusCount = 0;
        history.forEach(h => {
            if (h.isIncome) totalIncome += h.coin;
            else totalOutgoing += h.coin;
            if (h.title === 'Login Bonus') loginBonusCount++;
        });

        // Live stats
        const totalLives = liveSessions.length + pkBattles.length;
        const totalViews = [...liveSessions, ...pkBattles].reduce((s, l) => s + (l.view || 0), 0);
        const totalLiveCoins = [...liveSessions, ...pkBattles].reduce((s, l) => s + (l.totalCoinsEarned || 0), 0);

        res.render('admin/userDetails', {
            user,
            history,
            videos,
            posts,
            liveSessions,
            pkBattles,
            followers,
            following,
            visitors,
            stats: {
                totalIncome, totalOutgoing, loginBonusCount, totalTransactions: history.length,
                totalVideos: videos.length, totalPosts: posts.length,
                totalLives, totalViews, totalLiveCoins,
                totalPkBattles: pkBattles.length,
                totalFollowers: followers.length, totalFollowing: following.length,
                totalVisitors: visitors.length
            },
            pageTitle: 'User Details',
            page: 'users'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/admin/users');
    }
});


router.post('/users/:id/block', adminAuth, async (req, res) => {
    const user = await User.findById(req.params.id);
    user.isBlock = !user.isBlock;
    await user.save();
    res.redirect('/admin/users');
});

router.post('/users/:id/verify', adminAuth, async (req, res) => {
    const user = await User.findById(req.params.id);
    user.isVerified = !user.isVerified;
    await user.save();
    res.redirect('/admin/users');
});

router.post('/users/:id/delete', adminAuth, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    await Follow.deleteMany({ $or: [{ userId: req.params.id }, { followingId: req.params.id }] });
    await Post.deleteMany({ userId: req.params.id });
    await Video.deleteMany({ userId: req.params.id });
    res.redirect('/admin/users');
});

// ─── Agency Management ──────────────────────────────
router.get('/agencies', adminAuth, async (req, res) => {
    const search = req.query.search || '';
    const filter = req.query.status || '';
    let query = {};
    if (filter && filter !== 'All') query.status = filter;

    const agencies = await Agency.find(query).sort({ createdAt: -1 })
        .populate('ownerId', 'name userName image country').lean();

    // Enrich with host count and host earnings
    for (let a of agencies) {
        const hosts = await User.find({ agencyId: a._id, isHost: true }, 'receivedCoins isVIP').lean();
        a.hostCount = hosts.length;
        a.hostEarnings = hosts.reduce((s, h) => s + (h.receivedCoins || 0), 0);
        a.vipHostCount = hosts.filter(h => h.isVIP).length;
    }

    const allUsers = await User.find({}, 'name userName image _id').lean();

    res.render('admin/agencies', { agencies, allUsers, search, filter, pageTitle: 'Agencies', page: 'agencies' });
});

// Create agency
router.post('/agencies/create', adminAuth, async (req, res) => {
    try {
        const { ownerId, name, contactEmail, mobile, country, commissionRate, description } = req.body;
        const code = 'AG-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        await Agency.create({
            ownerId, name, contactEmail, mobile, country,
            commissionRate: parseFloat(commissionRate) || 10,
            description, code, status: 'Approved',
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`
        });
        await User.findByIdAndUpdate(ownerId, { role: 2 });
    } catch (e) { console.error(e); }
    res.redirect('/admin/agencies');
});

// Update commission
router.post('/agencies/:id/commission', adminAuth, async (req, res) => {
    await Agency.findByIdAndUpdate(req.params.id, { commissionRate: parseFloat(req.body.rate) || 10 });
    res.redirect('/admin/agencies');
});

router.post('/agencies/:id/approve', adminAuth, async (req, res) => {
    const agency = await Agency.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
    if (agency && agency.ownerId) await User.findByIdAndUpdate(agency.ownerId, { role: 2 });
    res.redirect('/admin/agencies');
});

router.post('/agencies/:id/reject', adminAuth, async (req, res) => {
    await Agency.findByIdAndUpdate(req.params.id, {
        status: 'Rejected', rejectionReason: req.body.reason || 'Not meeting criteria'
    });
    res.redirect('/admin/agencies');
});

router.post('/agencies/:id/delete', adminAuth, async (req, res) => {
    const agency = await Agency.findById(req.params.id);
    if (agency) {
        await User.updateMany({ agencyId: agency._id }, { $unset: { agencyId: '' }, isHost: false });
        if (agency.ownerId) await User.findByIdAndUpdate(agency.ownerId, { role: 0 });
        await Agency.findByIdAndDelete(req.params.id);
    }
    res.redirect('/admin/agencies');
});

// ─── Host Management ────────────────────────────────
router.get('/hosts', adminAuth, async (req, res) => {
    const search = req.query.search || '';
    const filterAgency = req.query.agency || '';
    let query = { isHost: true };
    if (filterAgency) query.agencyId = filterAgency;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { userName: { $regex: search, $options: 'i' } },
            { uniqueId: { $regex: search, $options: 'i' } }
        ];
    }

    const [hosts, totalHosts, maleHosts, femaleHosts, vipHosts, agencies] = await Promise.all([
        User.find(query).populate('agencyId', 'name code commissionRate image').sort({ createdAt: -1 }).lean(),
        User.countDocuments({ isHost: true }),
        User.countDocuments({ isHost: true, gender: 'Male' }),
        User.countDocuments({ isHost: true, gender: 'Female' }),
        User.countDocuments({ isHost: true, isVIP: true }),
        Agency.find({ status: 'Approved' }, 'name code').lean()
    ]);

    // Enrich host with post + video counts
    for (let h of hosts) {
        [h.postCount, h.videoCount] = await Promise.all([
            Post.countDocuments({ userId: h._id }),
            Video.countDocuments({ userId: h._id })
        ]);
    }

    res.render('admin/hosts', {
        hosts, agencies, search, filterAgency,
        stats: { totalHosts, maleHosts, femaleHosts, vipHosts },
        pageTitle: 'Host Management', page: 'hosts'
    });
});

// Toggle host status
router.post('/hosts/:id/toggle', adminAuth, async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.isHost = !user.isHost;
        if (!user.isHost) { user.agencyId = undefined; }
        await user.save();
    }
    res.redirect('/admin/hosts');
});

// Remove host from agency
router.post('/hosts/:id/remove-agency', adminAuth, async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { $unset: { agencyId: '' }, isHost: false });
    res.redirect('/admin/hosts');
});


// ─── Content Moderation ─────────────────────────────
router.get('/posts', adminAuth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const [posts, total] = await Promise.all([
        Post.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name userName').lean(),
        Post.countDocuments(),
    ]);
    res.render('admin/content', { items: posts, total, page, pages: Math.ceil(total / limit), type: 'posts', pageTitle: 'Posts' });
});

router.post('/posts/:id/delete', adminAuth, async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/admin/posts');
});

router.get('/videos', adminAuth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const [videos, total] = await Promise.all([
        Video.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'name userName').lean(),
        Video.countDocuments(),
    ]);
    res.render('admin/content', { items: videos, total, page, pages: Math.ceil(total / limit), type: 'videos', pageTitle: 'Videos' });
});

router.post('/videos/:id/ban', adminAuth, async (req, res) => {
    const v = await Video.findById(req.params.id);
    v.isBanned = !v.isBanned;
    await v.save();
    res.redirect('/admin/videos');
});

// ─── Gift Management ────────────────────────────────
router.get('/gifts', adminAuth, async (req, res) => {
    const categories = await GiftCategory.find().lean();
    const gifts = await Gift.find().populate('giftCategoryId', 'name').lean();
    res.render('admin/gifts', { categories, gifts, pageTitle: 'Gifts' });
});

router.post('/gifts/category/create', adminAuth, async (req, res) => {
    await GiftCategory.create(req.body);
    res.redirect('/admin/gifts');
});

router.post('/gifts/create', adminAuth, async (req, res) => {
    await Gift.create(req.body);
    res.redirect('/admin/gifts');
});

router.post('/gifts/:id/delete', adminAuth, async (req, res) => {
    await Gift.findByIdAndDelete(req.params.id);
    res.redirect('/admin/gifts');
});

router.post('/gifts/category/:id/delete', adminAuth, async (req, res) => {
    await GiftCategory.findByIdAndDelete(req.params.id);
    await Gift.deleteMany({ giftCategoryId: req.params.id });
    res.redirect('/admin/gifts');
});

// ─── Coin Plans ─────────────────────────────────────
router.get('/coin-plans', adminAuth, async (req, res) => {
    const plans = await CoinPlan.find().sort({ amount: 1 }).lean();
    res.render('admin/coinPlans', { plans, pageTitle: 'Coin Plans' });
});

router.post('/coin-plans/create', adminAuth, async (req, res) => {
    await CoinPlan.create({ coin: req.body.coin, amount: req.body.amount, productKey: req.body.productKey, isPopular: req.body.isPopular === 'on' });
    res.redirect('/admin/coin-plans');
});

router.post('/coin-plans/:id/delete', adminAuth, async (req, res) => {
    await CoinPlan.findByIdAndDelete(req.params.id);
    res.redirect('/admin/coin-plans');
});

// ─── VIP Plans ──────────────────────────────────────
router.get('/vip-plans', adminAuth, async (req, res) => {
    const plans = await VipPlan.find().sort({ amount: 1 }).lean();
    res.render('admin/vipPlans', { plans, pageTitle: 'VIP Plans' });
});

router.post('/vip-plans/create', adminAuth, async (req, res) => {
    const { name, validityType, validity, coinPrice, amount, icon, isPopular, benefits } = req.body;
    let parsedBenefits = [];
    if (benefits) {
        parsedBenefits = benefits.split(',').map(b => b.trim()).filter(b => b);
    }
    await VipPlan.create({
        name, validityType, validity: parseInt(validity), coinPrice: parseInt(coinPrice),
        amount: parseFloat(amount), icon: icon || 'vip_icon.png', isPopular: isPopular === 'on', benefits: parsedBenefits
    });
    res.redirect('/admin/vip-plans');
});

router.post('/vip-plans/:id/delete', adminAuth, async (req, res) => {
    await VipPlan.findByIdAndDelete(req.params.id);
    res.redirect('/admin/vip-plans');
});

// ─── Store Management ───────────────────────────────
router.get('/store', adminAuth, async (req, res) => {
    const items = await StoreItem.find().sort({ type: 1, sortOrder: 1 }).lean();
    res.render('admin/store', { items, pageTitle: 'Store' });
});

router.post('/store/create', adminAuth, async (req, res) => {
    await StoreItem.create(req.body);
    res.redirect('/admin/store');
});

router.post('/store/:id/delete', adminAuth, async (req, res) => {
    await StoreItem.findByIdAndDelete(req.params.id);
    res.redirect('/admin/store');
});

// ─── Reports ────────────────────────────────────────
router.get('/reports', adminAuth, async (req, res) => {
    const reports = await Report.find().sort({ createdAt: -1 }).populate('userId', 'name userName image').populate('reportedUserId', 'name userName image').lean();
    res.render('admin/reports', { reports, pageTitle: 'Reports' });
});

router.post('/reports/:id/resolve', adminAuth, async (req, res) => {
    await Report.findByIdAndUpdate(req.params.id, { status: 2, adminNote: req.body.adminNote || 'Resolved' });
    res.redirect('/admin/reports');
});

// ─── Help Tickets ───────────────────────────────────
router.get('/help', adminAuth, async (req, res) => {
    const tickets = await Help.find().sort({ createdAt: -1 }).populate('userId', 'name userName image').lean();
    res.render('admin/help', { tickets, pageTitle: 'Support' });
});

router.post('/help/:id/respond', adminAuth, async (req, res) => {
    await Help.findByIdAndUpdate(req.params.id, { adminResponse: req.body.response, status: parseInt(req.body.status) || 1 });
    res.redirect('/admin/help');
});

// ─── Settings ───────────────────────────────────────
router.get('/settings', adminAuth, async (req, res) => {
    let settings = await Setting.findOne();
    if (!settings) settings = await Setting.create({});
    res.render('admin/settings', { settings, pageTitle: 'Settings' });
});

router.post('/settings/update', adminAuth, async (req, res) => {
    const data = req.body;
    // Convert checkbox values
    const boolFields = ['isGooglePlayEnabled', 'isStripeEnabled', 'isRazorpayEnabled', 'isFlutterwaveEnabled', 'isDummyData', 'shortsEffectEnabled', 'watermarkEnabled'];
    boolFields.forEach(f => { data[f] = data[f] === 'on'; });
    const intFields = ['loginBonus', 'privateCallRate', 'durationOfShorts', 'minCoinsToCashOut', 'minCoinsForPayout', 'pkEndTime'];
    intFields.forEach(f => { if (data[f]) data[f] = parseInt(data[f]); });
    await Setting.findOneAndUpdate({}, data, { upsert: true });
    res.redirect('/admin/settings');
});

// ─── Songs ──────────────────────────────────────────
router.get('/songs', adminAuth, async (req, res) => {
    const songs = await Song.find().sort({ usageCount: -1 }).lean();
    res.render('admin/songs', { songs, pageTitle: 'Songs' });
});

router.post('/songs/create', adminAuth, async (req, res) => {
    await Song.create(req.body);
    res.redirect('/admin/songs');
});

router.post('/songs/:id/delete', adminAuth, async (req, res) => {
    await Song.findByIdAndDelete(req.params.id);
    res.redirect('/admin/songs');
});

// ─── Hashtags ───────────────────────────────────────
router.get('/hashtags', adminAuth, async (req, res) => {
    const hashtags = await Hashtag.find().sort({ usageCount: -1 }).lean();
    res.render('admin/hashtags', { hashtags, pageTitle: 'Hashtags' });
});

router.post('/hashtags/create', adminAuth, async (req, res) => {
    await Hashtag.create({ hashTag: req.body.hashTag, usageCount: 0 });
    res.redirect('/admin/hashtags');
});

router.post('/hashtags/:id/delete', adminAuth, async (req, res) => {
    await Hashtag.findByIdAndDelete(req.params.id);
    res.redirect('/admin/hashtags');
});

// ─── Live Monitoring ────────────────────────────────
router.get('/live', adminAuth, async (req, res) => {
    const rooms = await LiveHistory.find({ isActive: true }).populate('userId', 'name userName image').lean();
    res.render('admin/live', { rooms, pageTitle: 'Live Rooms' });
});

router.post('/live/:id/end', adminAuth, async (req, res) => {
    await LiveHistory.findByIdAndUpdate(req.params.id, { isActive: false, endedAt: new Date() });
    res.redirect('/admin/live');
});

// ─── Report Reasons ─────────────────────────────────
router.get('/report-reasons', adminAuth, async (req, res) => {
    const reasons = await ReportReason.find().lean();
    res.render('admin/reportReasons', { reasons, pageTitle: 'Report Reasons' });
});

router.post('/report-reasons/create', adminAuth, async (req, res) => {
    await ReportReason.create(req.body);
    res.redirect('/admin/report-reasons');
});

router.post('/report-reasons/:id/delete', adminAuth, async (req, res) => {
    await ReportReason.findByIdAndDelete(req.params.id);
    res.redirect('/admin/report-reasons');
});

module.exports = router;
