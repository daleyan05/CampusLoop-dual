(() => {
  const languageKey = "campusLoopLanguage";
  const translations = {
    "CampusLoop 入口中心": "CampusLoop Portal",
    "CampusLoop 二手市场": "CampusLoop Secondhand Market",
    "CampusLoop 找辅导入口": "CampusLoop Find a Tutor",
    "CampusLoop 辅导员接单入口": "CampusLoop Tutor Portal",
    "CampusLoop 店长派单入口": "CampusLoop Manager Console",
    "CampusLoop 辅导进度": "CampusLoop Tutoring Progress",
    "论文辅导采用平台派单制并保留三个独立入口；二手买卖使用一个统一市场入口，不区分不同版本。": "Tutoring uses a platform-managed dispatch model with three separate portals. Secondhand trading uses one unified marketplace.",
    "选择入口": "Choose a portal",
    "论文辅导三端 · 二手市场一个入口": "Three tutoring portals · One secondhand marketplace",
    "店长派单端": "Manager dispatch portal",
    "密码保护的唯一店长账号。查看双方联系方式，按专业、科目和地区匹配辅导员，统一派单与中转沟通。": "A password-protected, single manager account. Review both parties' contact details, match tutors by major, subject and region, and coordinate all communication.",
    "密码保护的唯一店长账号。查看双方联系方式，审核辅导员抢单结果，统一派单与中转沟通。": "A password-protected, single manager account. Review both parties' contact details, approve tutor claims, and coordinate dispatch and communication.",
    "进入店长派单端": "Open manager portal",
    "辅导员端": "Tutor portal",
    "先注册并提交人脸照、身份证照片完成实名认证，再登记专业、科目和地区并申请接单。": "Register and submit a face photo and ID photo for verification before completing your tutor profile and applying for orders.",
    "先注册并完成实名认证，再登记专业、科目和地区抢单；抢单后须经店长审核。": "Register and complete identity verification, then claim orders by major, subject and region. Every claim requires manager approval.",
    "进入辅导员端": "Open tutor portal",
    "找辅导端": "Student portal",
    "细化填写专业、具体科目、地区、预算与截止日期，交由店长匹配。": "Provide your major, course, region, budget and deadline for the manager to match.",
    "细化填写专业、具体科目、地区、预算与截止日期，发布到辅导员抢单大厅。": "Provide your major, course, region, budget and deadline, then publish to the tutor order pool.",
    "进入找辅导端": "Open student portal",
    "二手市场": "Secondhand market",
    "按国家、城市和地区浏览或发布二手商品，登录后既可以买也可以卖，并通过私信沟通。": "Browse or list secondhand items by country, city and area. Sign in to buy, sell and message other users.",
    "进入二手市场": "Open marketplace",

    "找辅导入口": "Student portal",
    "告诉店长你需要哪一门辅导": "Tell the manager what tutoring you need",
    "按专业、具体科目和地区发布需求，需求会进入辅导员抢单大厅。店长审核抢单结果后，你可以查看辅导员名片并预约。": "Publish a request by major, course and region. It will appear in the tutor order pool. After the manager reviews the tutor, you can view the tutor card and book.",
    "按专业、具体科目和地区提交需求。平台店长负责匹配和派单，不会向辅导员展示你的联系方式。": "Submit your request by major, course and region. The manager handles matching and dispatch without showing your contact details to tutors.",
    "联系方式由平台保管": "Contact details are held by the platform",
    "辅导员只能看到学习需求和订单编号；审核通过的名片也不显示联系方式，沟通由店长统一中转。": "Tutors only see the learning request and order number. Approved tutor cards also hide contact details, and the manager relays all communication.",
    "辅导员只能看到学习需求和订单编号，沟通由店长统一中转。": "Tutors only see the learning request and order number. The manager relays all communication.",
    "提交辅导需求": "Submit a tutoring request",
    "信息越细，匹配越准": "More detail means a better match",
    "预约意向": "Preferred tutor",
    "提交需求后，该辅导员会收到你的预约申请；接单后仍须由店长审核。": "After you submit, this tutor will receive your booking request. Manager review is still required after the tutor accepts.",
    "取消指定": "Clear selection",
    "称呼": "Name",
    "联系方式": "Contact details",
    "专业方向": "Major",
    "请选择专业": "Select a major",
    "具体科目 / 课程名称": "Subject / course name",
    "学历阶段": "Study level",
    "请选择": "Select",
    "预科": "Foundation",
    "本科": "Undergraduate",
    "硕士": "Master's",
    "博士": "Doctoral",
    "辅导类型": "Tutoring type",
    "课程知识辅导": "Course tutoring",
    "作业思路梳理": "Assignment guidance",
    "论文结构指导": "Thesis structure guidance",
    "文献综述指导": "Literature review guidance",
    "数据分析指导": "Data analysis guidance",
    "语言润色建议": "Language editing advice",
    "答辩准备": "Defense preparation",
    "预算（人民币）": "Budget (CNY)",
    "国家": "Country",
    "城市": "City",
    "地区 / 时区": "Area / time zone",
    "希望开始日期": "Preferred start date",
    "截止日期": "Deadline",
    "需求说明": "Request details",
    "我同意由平台店长保管联系方式并代为匹配，辅导员无法直接查看。": "I agree that the manager may hold my contact details and arrange the match. Tutors cannot view them directly.",
    "提交给店长匹配": "Submit for manager matching",
    "发布到辅导员抢单大厅": "Publish to tutor order pool",
    "我的需求进度": "My request status",
    "本机只显示使用当前联系方式提交的需求。": "This device only shows requests submitted with the current contact details.",
    "可预约辅导员": "Tutors available to book",
    "仅展示已通过平台认证的辅导员": "Only platform-verified tutors are shown",
    "查看专业、科目、地区、价格和可预约时间。点击申请后，请在上方补充具体辅导需求；双方联系方式仍由店长保管。": "Review each tutor's major, subjects, location, rate and availability. Select Book, then complete your tutoring request above. The manager continues to hold both parties' contact details.",
    "例如：李同学": "Example: Student Li",
    "微信 / 邮箱 / 手机号": "WeChat / email / phone",
    "例如：Corporate Finance / COMP3001": "Example: Corporate Finance / COMP3001",
    "例如：200 元/小时或总预算 1200 元": "Example: CNY 200/hour or CNY 1,200 total",
    "例如：UCL 附近 / GMT": "Example: near UCL / GMT",
    "写清课程难点、作业要求、当前进度和希望的辅导方式。请不要在这里填写联系方式。": "Describe the difficult topics, assignment requirements, current progress and preferred tutoring style. Do not include contact details here.",

    "辅导员入口": "Tutor portal",
    "退出登录": "Sign out",
    "注册并完成实名认证后接单": "Register and verify your identity before accepting orders",
    "新辅导员须提交清晰正面人脸照和身份证照片。店长核验人脸与身份证为同一人并通过认证后，账号才能登录接单。": "New tutors must submit a clear front-facing photo and an ID photo. The account can sign in only after the manager confirms that both photos show the same person.",
    "隐私与演示说明": "Privacy and demo notice",
    "当前为本地静态演示，资料仅保存在当前浏览器。请勿上传真实身份证；正式上线须接入加密后台与合规实名认证服务。": "This is a local static demo and data is stored only in this browser. Do not upload a real ID. Production use requires encrypted backend storage and a compliant identity-verification service.",
    "辅导员登录": "Tutor sign in",
    "登录账号": "Login account",
    "密码": "Password",
    "认证账号登录": "Sign in with verified account",
    "注册与实名认证": "Register and verify identity",
    "真实姓名": "Legal name",
    "手机号或邮箱（登录账号）": "Phone or email (login account)",
    "手机号或邮箱": "Phone or email",
    "设置密码": "Create password",
    "确认密码": "Confirm password",
    "至少 8 位": "At least 8 characters",
    "清晰正面人脸照": "Clear front-facing photo",
    "正脸无遮挡，图片不超过 700KB。": "Face the camera without obstruction. Image must be under 700KB.",
    "身份证照片": "ID photo",
    "须能清楚辨认照片，图片不超过 700KB。": "The portrait must be clearly visible. Image must be under 700KB.",
    "我确认人脸照为本人，且与身份证照片中的人员一致，并同意提交店长审核。": "I confirm that the face photo is mine and matches the person shown on the ID, and I agree to submit it for manager review.",
    "提交注册与认证": "Submit registration and verification",
    "按专业、科目和地区申请接单": "Apply for orders by major, subject and region",
    "按专业、科目和地区抢单": "Claim orders by major, subject and region",
    "你可以查看脱敏后的辅导需求并抢单。抢单后须由店长审核，通过后等待学员预约，学员联系方式始终不可见。": "View anonymized tutoring requests and claim orders. Each claim requires manager approval, then waits for student booking. Student contact details remain hidden.",
    "你可以查看脱敏后的辅导需求并申请。店长完成匹配后再派单，学员联系方式始终不可见。": "View anonymized tutoring requests and apply. The manager dispatches orders after matching, and student contact details remain hidden.",
    "禁止绕过平台联系学员": "Do not contact students outside the platform",
    "订单只显示编号和学习需求；确认接单后仍由店长中转沟通。": "Orders show only an ID and learning needs. The manager continues to relay communication after acceptance.",
    "订单只显示编号和学习需求；抢单、审核和预约完成后仍由店长中转沟通。": "Orders show only an ID and learning needs. The manager still relays communication after claiming, approval and booking.",
    "辅导能力与接单地区": "Tutoring skills and service region",
    "尚未登记": "Not registered",
    "显示名称": "Display name",
    "例如：Dale 老师": "Example: Tutor Dale",
    "每小时价格（人民币）": "Hourly rate (CNY)",
    "例如：200 元/小时": "Example: CNY 200/hour",
    "平台认证电话": "Platform-verified phone",
    "平台认证微信": "Platform-verified WeChat",
    "仅店长可见": "Manager only",
    "主要专业": "Primary major",
    "可辅导的具体科目": "Subjects you can tutor",
    "用逗号分隔，例如：公司金融, APA, SPSS": "Separate with commas, e.g. Corporate Finance, APA, SPSS",
    "例如：英国": "Example: United Kingdom",
    "例如：伦敦": "Example: London",
    "例如：GMT": "Example: GMT",
    "可预约时间": "Availability",
    "例如：周一至周五 18:00–22:00（北京时间）": "Example: Monday–Friday, 18:00–22:00 (China Standard Time)",
    "个人简介": "Profile",
    "学历背景、擅长课程、可接单时间。不要填写公开联系方式。": "Add your education, strongest subjects and availability. Do not include public contact details.",
    "上传证明（教师资格证、学生证等）": "Upload credentials (teaching certificate, student ID, etc.)",
    "支持图片或 PDF，文件不超过 1MB；证明仅店长端可查看。": "Images or PDF, up to 1MB. Credentials are visible only to the manager.",
    "保存辅导员资料": "Save tutor profile",
    "可申请订单": "Available orders",
    "可抢订单": "Orders available to claim",
    "抢单后由店长审核": "Manager review required after claiming",
    "不显示学员联系方式": "Student contact details hidden",
    "我的派单": "My assigned orders",
    "我的抢单与审核结果": "My claimed and approved orders",

    "店长唯一账号": "Single manager account",
    "退出": "Sign out",
    "店长后台登录": "Manager sign in",
    "此入口只有一个“店长”账号。输入正确密码后才能查看双方联系方式和执行派单。": "This portal has one manager account. Enter the correct password to view both parties' contact details and manage dispatch.",
    "账号": "Account",
    "店长（唯一账号）": "Manager (single account)",
    "店长密码": "Manager password",
    "请输入店长密码": "Enter the manager password",
    "进入店长派单端": "Enter manager console",
    "返回入口中心": "Back to portal",
    "你是双方信息的唯一中转": "You are the sole information intermediary",
    "集中查看学员需求和辅导员资料，按专业、具体科目与地区匹配，派单后继续由平台协调双方沟通。": "Review student requests and tutor profiles, match by major, course and region, and continue coordinating communication after dispatch.",
    "集中查看学员需求和辅导员抢单结果，审核适合的辅导员并派单，学员预约后继续由平台协调双方沟通。": "Review student requests and tutor claims, approve a suitable tutor, and keep coordinating after the student books.",
    "仅店长端显示双方联系方式": "Only the manager can see both parties' contact details",
    "找辅导端和辅导员端均不会渲染对方联系方式。": "Neither the student nor tutor portal displays the other party's contact details.",
    "派单统计": "Dispatch statistics",
    "待匹配": "Awaiting match",
    "已有申请": "Applications received",
    "已派单": "Dispatched",
    "等待抢单": "Awaiting tutor claim",
    "抢单待审核": "Claim awaiting review",
    "抢单待店长审核": "Claim awaiting manager review",
    "审核通过": "Approved",
    "已预约 / 完成": "Booked / completed",
    "已确认 / 完成": "Confirmed / completed",
    "辅导员实名认证审核": "Tutor identity verification review",
    "核验人脸照与身份证照片是否为同一人": "Confirm that the face photo and ID photo show the same person",
    "仅店长可查看认证照片。确认一致后通过；资料模糊或不一致时请驳回。": "Only the manager can view verification photos. Approve when they match; reject unclear or inconsistent submissions.",
    "需求与派单": "Requests and dispatch",
    "需求、抢单审核与派单": "Requests, claim review and dispatch",
    "全部状态": "All statuses",
    "搜索订单、专业、科目或地区": "Search orders, majors, subjects or regions",
    "已确认": "Confirmed",
    "已完成": "Completed",
    "辅导员资源库": "Tutor directory",
    "联系方式仅此处可见": "Contact details visible only here",
    "更改店长密码": "Change manager password",
    "唯一账号 · 单一有效登录": "Single account · One active session",
    "当前密码": "Current password",
    "新密码": "New password",
    "确认新密码": "Confirm new password",
    "确认修改密码": "Confirm password change",

    "商科与管理": "Business and management",
    "会计与金融": "Accounting and finance",
    "经济学": "Economics",
    "计算机科学": "Computer science",
    "数据科学与统计": "Data science and statistics",
    "工程学": "Engineering",
    "教育学": "Education",
    "心理学": "Psychology",
    "法律": "Law",
    "医学与健康": "Medicine and health",
    "文学与语言": "Literature and languages",
    "艺术与设计": "Art and design",
    "传媒": "Media and communications",
    "音乐专业": "Music",
    "其他": "Other",

    "逛二手": "Browse",
    "发布商品": "List item",
    "私信": "Messages",
    "登录 / 注册": "Sign in / Register",
    "留学生二手市场": "International Student Secondhand Market",
    "按国家、城市和地区寻找教材、家具与生活用品。一个入口，登录后既可以发布商品，也可以联系卖家。": "Find textbooks, furniture and household items by country, city and area. Sign in to list items or contact sellers.",
    "开始逛二手": "Start browsing",
    "发布二手商品": "List a secondhand item",
    "附近好物": "Nearby finds",
    "让闲置继续有用": "Give unused items a second life",
    "浏览 · 发布 · 私信": "Browse · List · Message",
    "二手商品": "Secondhand items",
    "＋ 发布商品": "+ List item",
    "筛选商品": "Filter items",
    "清除": "Clear",
    "搜索": "Search",
    "全部国家": "All countries",
    "全部城市（请先选择国家）": "All cities (select a country first)",
    "全部城市": "All cities",
    "地区 / 州省": "Area / state",
    "全部地区（请先选择国家）": "All areas (select a country first)",
    "全部地区 / 州省": "All areas / states",
    "商品分类": "Category",
    "全部分类": "All categories",
    "教材书籍": "Textbooks and books",
    "家具家居": "Furniture and home",
    "数码电器": "Electronics",
    "厨房用品": "Kitchenware",
    "服饰用品": "Clothing",
    "最新发布": "Newest",
    "价格从低到高": "Price: low to high",
    "价格从高到低": "Price: high to low",
    "私信中心": "Message center",
    "登录后查看与买家或卖家的商品沟通。": "Sign in to view conversations with buyers and sellers.",
    "登录后使用私信": "Sign in to use messages",
    "登录账号即可联系卖家并保存会话。": "Sign in to contact sellers and save conversations.",
    "商品会话": "Item conversations",
    "请选择一个会话": "Select a conversation",
    "从左侧选择商品后开始沟通。": "Select an item on the left to start chatting.",
    "发送私信": "Send message",
    "返回 CampusLoop 入口中心": "Back to CampusLoop Portal",
    "登录二手市场": "Sign in to the marketplace",
    "一个普通账号即可浏览、买卖和私信，不区分不同版本。": "One standard account can browse, buy, sell and message. There are no separate editions.",
    "账号入口": "Account access",
    "登录": "Sign in",
    "注册": "Register",
    "昵称": "Display name",
    "邮箱": "Email",
    "至少 6 位": "At least 6 characters",
    "登录账号": "Sign in",
    "关闭": "Close",
    "填写商品价格和所在地区，方便附近用户找到它。": "Add the price and location so nearby users can find your item.",
    "商品照片（可选）": "Item photo (optional)",
    "照片预览": "Photo preview",
    "商品名称": "Item name",
    "出售价格": "Price",
    "货币": "Currency",
    "英镑 £": "British pound £",
    "人民币 ¥": "Chinese yuan ¥",
    "美元 $": "US dollar $",
    "欧元 €": "Euro €",
    "加元 C$": "Canadian dollar C$",
    "澳元 A$": "Australian dollar A$",
    "手动填写城市": "Enter city manually",
    "手动填写具体地区": "Enter area manually",
    "商品描述": "Item description",
    "发布到二手市场": "List in marketplace",
    "CampusLoop 留学生二手市场：按国家、城市和地区浏览、发布并沟通二手商品。": "CampusLoop international student secondhand marketplace: browse, list and discuss items by country, city and area.",
    "CampusLoop 二手市场首页": "CampusLoop marketplace home",
    "二手市场导航": "Marketplace navigation",
    "商品筛选": "Item filters",
    "商品排序": "Item sorting",
    "会话列表": "Conversation list",
    "书桌、台灯、教材": "Desk, lamp, textbooks",
    "你的昵称": "Your display name",
    "例如：台灯、书桌、教材": "Example: lamp, desk, textbooks",
    "例如：25": "Example: 25",
    "输入数据中没有的城市": "Enter a city not listed",
    "例如：Bloomsbury、杨浦区": "Example: Bloomsbury or Yangpu District",
    "成色、取货方式、使用情况等": "Condition, collection method, usage and other details",
    "商品照片预览": "Item photo preview",

    "价格面议": "Price negotiable",
    "未填写": "Not provided",
    "刚刚": "Just now",
    "卖家暂未填写商品描述。": "The seller has not added a description.",
    "查看商品会话": "View item conversations",
    "联系卖家": "Contact seller",
    "下架": "Remove listing",
    "没有找到匹配的商品": "No matching items found",
    "可以清除筛选条件，或发布一件新的二手商品。": "Clear the filters or list a new secondhand item.",
    "创建账号": "Create account",
    "账号已创建。": "Account created.",
    "已退出账号。": "Signed out.",
    "其他城市（手动填写）": "Other city (enter manually)",
    "其他地区（手动填写）": "Other area (enter manually)",
    "请选择有效的图片文件。": "Select a valid image file.",
    "正在处理照片…": "Processing photo…",
    "照片读取失败，请换一张再试。": "Could not read the photo. Try another image.",
    "商品已发布到二手市场。": "Item listed in the marketplace.",
    "商品已下架，会话记录仍然保留。": "Listing removed. Conversations are retained.",
    "这件商品已下架。": "This item has been removed.",
    "这是你自己发布的商品。": "This is your own listing.",
    "卖家": "Seller",
    "暂无商品会话。点击商品的“联系卖家”开始沟通。": "No conversations yet. Select Contact seller on an item to start chatting.",
    "已下架商品": "Removed listing",
    "还没有消息": "No messages yet",
    "选择会话后即可发送私信。": "Select a conversation to send a message.",
    "还没有消息，发送第一条私信吧。": "No messages yet. Send the first message.",
    "这件商品暂时还没有买家咨询。": "No buyers have asked about this item yet.",
    "请完整填写商品名称、价格、国家、城市和地区。": "Complete the item name, price, country, city and area.",
    "请完整填写账号信息。": "Complete all account details.",
    "密码至少需要 6 位。": "Password must be at least 6 characters.",
    "这个邮箱已经注册，可以直接登录。": "This email is already registered. You can sign in directly.",
    "没有找到这个账号，请先注册。": "Account not found. Register first.",
    "密码不正确。": "Incorrect password.",
    "我": "Me",

    "实木学习书桌": "Solid wood study desk",
    "九成新，桌面宽敞，适合宿舍学习。需自取。": "Like new with a spacious desktop, ideal for dorm study. Collection only.",
    "商科核心教材套装": "Core business textbook set",
    "共 4 本，有少量课堂笔记，可在大学附近交付。": "Set of four with a few class notes. Handover available near the university.",
    "24 寸显示器": "24-inch monitor",
    "1080P，接口正常，附电源线和 HDMI 线。": "1080p, all ports working, with power and HDMI cables.",
    "小型电饭煲": "Compact rice cooker",
    "适合一到两人使用，搬家出清，可地铁站交付。": "Suitable for one or two people. Moving sale; handover at a metro station.",
    "防水冬季外套": "Waterproof winter coat",
    "M 码，只穿过几次，保暖防雨。": "Size M, worn only a few times, warm and rainproof.",
    "可调光护眼台灯": "Dimmable desk lamp",
    "三档色温，USB 供电，灯光和按键都正常。": "Three color temperatures, USB powered, with lights and controls fully working.",

    "待店长匹配": "Awaiting manager match",
    "已有辅导员申请": "Tutor applications received",
    "店长已派单": "Dispatched by manager",
    "辅导员已确认": "Confirmed by tutor",
    "申请接单": "Apply for order",
    "立即抢单": "Claim order now",
    "接受预约申请": "Accept booking request",
    "学员向你发起预约申请": "A student sent you a booking request",
    "等待辅导员抢单": "Awaiting tutor claim",
    "店长审核通过": "Approved by manager",
    "学员已预约": "Booked by student",
    "学员联系方式不可见": "Student contact details hidden",
    "当前没有开放的脱敏订单。": "There are currently no open anonymized orders.",
    "店长尚未向你派单。": "The manager has not assigned you an order yet.",
    "你还没有抢单或通过审核的订单。": "You have no claimed or approved orders yet.",
    "已抢单，等待店长审核": "Claimed; awaiting manager review",
    "店长审核通过，等待学员预约": "Approved by manager; awaiting student booking",
    "学员已预约，等待店长协调": "Booked by student; awaiting manager coordination",
    "待审核": "Pending review",
    "已通过": "Approved",
    "已驳回": "Rejected",
    "撤销认证": "Revoke verification",
    "重新通过": "Approve again",
    "确认一致并通过": "Confirm match and approve",
    "驳回认证": "Reject verification",
    "清晰正面人脸照": "Clear front-facing photo",
    "身份证照片": "ID photo",
    "人脸照无效": "Invalid face photo",
    "身份证照片无效": "Invalid ID photo",
    "请人工核验两张照片是否清晰、是否为同一人；本静态演示版不执行自动生物识别。": "Manually confirm that both photos are clear and show the same person. This static demo does not perform automatic biometric verification.",
    "暂时没有待审核的辅导员注册资料。": "There are no tutor registrations awaiting review.",
    "还没有辅导员登记资料。": "No tutor profiles have been registered yet.",
    "没有符合筛选条件的辅导需求。": "No tutoring requests match the filters.",
    "还没有提交需求。填写左侧表单后，店长会在这里更新派单进度。": "No requests submitted yet. Complete the form and the manager will update the dispatch status here.",
    "需求已发布到辅导员抢单大厅，等待辅导员抢单。": "Your request is in the tutor order pool and is awaiting a claim.",
    "已有辅导员抢单，正在等待店长审核。": "A tutor has claimed the order and is awaiting manager review.",
    "店长审核通过，辅导员名片已开放，你可以点击预约。": "The manager approved a tutor. The tutor card is now available for booking.",
    "你已预约辅导员，后续沟通由店长统一协调。": "You booked the tutor. The manager will coordinate all further communication.",
    "店长审核通过的辅导员名片": "Manager-approved tutor card",
    "本次辅导已完成": "Tutoring completed",
    "已预约，等待店长协调": "Booked; awaiting manager coordination",
    "预约该辅导员": "Book this tutor",
    "申请预约辅导员": "Request this tutor",
    "可辅导科目：": "Tutoring subjects:",
    "请向店长确认具体时间": "Confirm the exact time with the manager",
    "申请时不公开双方联系方式": "Neither party's contact details are disclosed when applying",
    "当前还没有可预约的认证辅导员。": "There are no verified tutors available to book yet.",
    "该辅导员目前不可预约，请选择其他辅导员。": "This tutor is currently unavailable. Select another tutor.",
    "该辅导员目前不可预约，请重新选择。": "This tutor is currently unavailable. Please select again.",
    "名片不显示联系方式，预约后仍由店长中转": "Contact details are hidden; the manager still relays communication after booking",
    "预约已提交，店长将继续中转双方沟通。": "Booking submitted. The manager will continue relaying communication.",
    "店长尚未派单，请等待平台匹配。": "The manager has not dispatched an order yet. Please wait for matching.",
    "已有辅导员申请，店长正在筛选。": "Tutors have applied and the manager is reviewing them.",
    "店长已选择辅导员，正在等待对方确认。": "The manager selected a tutor and is waiting for confirmation.",
    "辅导员已确认，后续沟通由店长统一协调。": "The tutor has confirmed. The manager will coordinate all further communication.",
    "本次辅导订单已完成。": "This tutoring order is complete.",
    "等待平台处理。": "Awaiting platform processing.",
    "辅导员联系方式由店长保管": "Tutor contact details are held by the manager",
    "截止日期不能早于希望开始日期。": "The deadline cannot be earlier than the preferred start date.",
    "请先保存辅导员资料": "Save your tutor profile first",
    "已申请，等待店长派单": "Applied; awaiting manager dispatch",
    "确认接单": "Accept order",
    "无法接单": "Decline order",
    "已确认，等待店长协调": "Confirmed; awaiting manager coordination",
    "订单已完成": "Order completed",
    "账号或密码不正确。": "Incorrect account or password.",
    "实名认证正在等待店长审核，通过后才能登录接单。": "Identity verification is awaiting manager review. You can sign in after approval.",
    "实名认证未通过，请联系平台重新提交清晰、相符的认证照片。": "Identity verification was rejected. Contact the platform and resubmit clear, matching photos.",
    "认证通过，登录成功。": "Verification approved. Signed in successfully.",
    "该手机号或邮箱已经注册，请直接登录。": "This phone number or email is already registered. Sign in directly.",
    "密码至少需要 8 位。": "Password must be at least 8 characters.",
    "两次输入的密码不一致。": "The passwords do not match.",
    "注册资料已提交。店长核验人脸照与身份证照片一致并通过后，即可登录。": "Registration submitted. You can sign in after the manager confirms that the face and ID photos match.",
    "认证照片占用空间过大，请压缩图片后重新提交。": "Verification photos are too large. Compress them and submit again.",
    "请上传教师资格证、学生证等证明文件。": "Upload a teaching certificate, student ID or other credential.",
    "证明文件不能超过 1MB。": "The credential file must be under 1MB.",
    "证明文件仅支持图片或 PDF。": "Credentials must be an image or PDF.",
    "证明文件读取失败，请重新选择。": "Could not read the credential file. Select it again.",
    "暂无辅导员资料": "No tutor profiles available",
    "暂无辅导员抢单": "No tutor claims yet",
    "选择辅导员": "Select a tutor",
    "选择已抢单辅导员": "Select a tutor who claimed the order",
    "未记录": "Not recorded",
    "尚未派单": "Not dispatched",
    "尚未选择辅导员": "No tutor selected",
    "学员联系方式（仅店长可见）": "Student contact details (manager only)",
    "已派辅导员联系方式（仅店长可见）": "Assigned tutor contact details (manager only)",
    "审核通过辅导员联系方式（仅店长可见）": "Approved tutor contact details (manager only)",
    "匹配与派单": "Match and dispatch",
    "抢单审核": "Claim review",
    "学员预约意向": "Student's preferred tutor",
    "辅导员已接受，等待审核": "Tutor accepted; awaiting review",
    "等待辅导员接受预约申请": "Awaiting tutor acceptance",
    "重新派单": "Reassign",
    "重新审核": "Review again",
    "确认派单": "Confirm dispatch",
    "审核通过并派单": "Approve and dispatch",
    "标记完成": "Mark complete",
    "重新打开": "Reopen",
    "双方页面均不显示对方联系方式": "Neither party can see the other's contact details",
    "审核通过后学员只看到辅导员名片，不显示联系方式": "After approval, the student sees only the tutor card, without contact details",
    "未上传证明": "No credential uploaded",
    "已上传文件": "Uploaded file",
    "科目：": "Subjects:",
    "认证证明：": "Verified credential:",
    "当前店长登录已失效，请重新输入密码。": "The manager session has expired. Enter the password again.",
    "正在验证…": "Verifying…",
    "密码不正确，无法进入店长后台。": "Incorrect password. Manager access denied.",
    "已安全退出店长后台。": "Signed out of the manager console securely.",
    "当前密码不正确。": "The current password is incorrect.",
    "新密码至少需要 8 位。": "The new password must be at least 8 characters.",
    "两次输入的新密码不一致。": "The new passwords do not match.",
    "新密码不能与当前密码相同。": "The new password must differ from the current password.",
    "密码修改成功，下次请使用新密码登录。": "Password changed. Use the new password next time.",
    "另一处已登录店长账号，本页面的登录已失效。": "The manager account was signed in elsewhere, so this session has expired.",

    "辅导进度页": "Tutoring progress",
    "辅导员进度页": "Tutor progress",
    "学员进度页": "Student progress",
    "返回订单列表": "Back to orders",
    "暂时无法进入此进度页面": "This progress page is currently unavailable",
    "进度页面链接不完整，请从订单卡片重新进入。": "This progress link is incomplete. Reopen it from the order card.",
    "没有找到该辅导订单，请返回订单列表检查。": "This tutoring order was not found. Return to the order list to check.",
    "双方审核与预约尚未完成，暂时不能进入辅导进度。": "Review and booking are not complete, so tutoring progress is not available yet.",
    "当前学员端没有查看该订单的权限。": "This student portal does not have permission to view the order.",
    "请先登录已获审核通过且负责此订单的辅导员账号。": "Sign in with the verified tutor account assigned to this order.",
    "查看辅导进度与完成作业": "View tutoring progress and completed work",
    "双方审核和预约完成后，可在这里查看同一订单的辅导进度。": "After review and booking, both parties can view the same order progress here.",
    "更新辅导进度并提交完成作业": "Update progress and submit completed work",
    "查看辅导进度与接收完成作业": "View progress and receive completed work",
    "你可以更新订单的完成比例和进度说明，并向学员提交完成作业；双方联系方式仍由店长统一保管。": "Update the order percentage and progress note, then submit completed work to the student. The manager continues to hold both parties' contact details.",
    "辅导员更新的进度和提交的完成作业会显示在这里，你可以直接查看或下载；双方联系方式仍由店长统一保管。": "Tutor progress updates and completed work appear here for viewing or download. The manager continues to hold both parties' contact details.",
    "店长继续担任信息中转": "The manager remains the information intermediary",
    "本页不显示双方联系方式。辅导员负责更新进度和提交完成作业，学员负责查看与下载。": "This page hides both parties' contact details. The tutor updates progress and submits work; the student views and downloads it.",
    "双方同步进度": "Shared progress",
    "同一订单实时同步": "Synced on the same order",
    "辅导订单摘要": "Tutoring order summary",
    "学员订单": "Student order",
    "已审核辅导员": "Approved tutor",
    "辅导完成进度": "Tutoring completion progress",
    "等待辅导员更新进度说明。": "Waiting for the tutor to add a progress note.",
    "辅导员还没有提交完成作业。": "The tutor has not submitted completed work yet.",
    "辅导员提交的完成作业": "Completed work submitted by the tutor",
    "查看 / 下载作业": "View / download work",
    "文件不可用": "File unavailable",
    "进入辅导进度": "Open tutoring progress",
    "辅导员更新与完成作业提交": "Tutor progress and completed-work submission",
    "仅负责此订单的辅导员可操作": "Only the tutor assigned to this order can make changes",
    "订单已由店长标记完成": "The manager marked this order complete",
    "当前进度和已提交作业仍可查看，但不能继续修改。": "The current progress and submitted work remain available, but can no longer be changed.",
    "更新辅导完成比例": "Update tutoring completion",
    "当前完成进度": "Current completion",
    "进度说明": "Progress note",
    "例如：已完成资料整理和第一部分讲解，下一步进行数据分析。": "Example: Research and the first explanation are complete; data analysis is next.",
    "同步更新双方进度": "Sync progress for both parties",
    "提交完成作业": "Submit completed work",
    "选择完成作业文件": "Choose completed-work file",
    "支持 PDF、Word、Excel、PPT、ZIP 或常用图片，每个文件不超过 2MB。": "Supports PDF, Word, Excel, PPT, ZIP, and common images, up to 2MB per file.",
    "提交说明": "Submission note",
    "例如：最终版作业已提交，请学员下载查看。": "Example: The final work is ready. Please download and review it.",
    "提交完成作业后，双方进度会自动更新为 100%；仍由店长最终标记订单完成。": "Submitting completed work automatically sets both parties' progress to 100%. The manager still marks the order complete.",
    "上传并发送给学员": "Upload and send to student",
    "请选择要提交的完成作业。": "Choose the completed work to submit.",
    "完成作业仅支持 PDF、Word、Excel、PPT、ZIP 或常用图片格式。": "Completed work must be PDF, Word, Excel, PPT, ZIP, or a common image format.",
    "完成作业文件不能超过 2MB。": "The completed-work file must be under 2MB.",
    "文件内容或格式无法安全读取，请更换文件。": "The file content or format could not be read safely. Choose another file.",
    "完成作业读取失败，请重新选择。": "Could not read the completed work. Select it again.",
    "该订单已经由店长标记完成，不能继续修改进度。": "The manager marked this order complete, so its progress can no longer be changed.",
    "进度保存失败，请清理浏览器本地空间后重试。": "Could not save progress. Free some browser storage and try again.",
    "该订单已经由店长标记完成，不能继续提交作业。": "The manager marked this order complete, so work can no longer be submitted.",
    "正在读取并提交完成作业…": "Reading and submitting completed work…",
    "完成作业已提交，请学员查看或下载。": "Completed work submitted. The student can view or download it.",
    "完成作业已提交，双方进度已同步为 100%。": "Completed work submitted. Both parties' progress is now 100%.",
    "浏览器本地空间不足，无法保存作业；请压缩文件后重试。": "Browser storage is full. Compress the work file and try again."
  };

  const countryCodes = "AF,AL,DZ,AD,AO,AG,AR,AM,AU,AT,AZ,BS,BH,BD,BB,BY,BE,BZ,BJ,BT,BO,BA,BW,BR,BN,BG,BF,BI,CV,KH,CM,CA,CF,TD,CL,CN,CO,KM,CG,CR,CI,HR,CU,CY,CZ,CD,DK,DJ,DM,DO,EC,EG,SV,GQ,ER,EE,SZ,ET,FJ,FI,FR,GA,GM,GE,DE,GH,GR,GD,GT,GN,GW,GY,HT,HN,HU,IS,IN,ID,IR,IQ,IE,IL,IT,JM,JP,JO,KZ,KE,KI,KP,KR,KW,KG,LA,LV,LB,LS,LR,LY,LI,LT,LU,MG,MW,MY,MV,ML,MT,MH,MR,MU,MX,FM,MD,MC,MN,ME,MA,MZ,MM,NA,NR,NP,NL,NZ,NI,NE,NG,MK,NO,OM,PK,PW,PA,PG,PY,PE,PH,PL,PT,QA,RO,RU,RW,KN,LC,VC,WS,SM,ST,SA,SN,RS,SC,SL,SG,SK,SI,SB,SO,ZA,SS,ES,LK,SD,SR,SE,CH,SY,TJ,TZ,TH,TL,TG,TO,TT,TN,TR,TM,TV,UG,UA,AE,GB,US,UY,UZ,VU,VE,VN,YE,ZM,ZW,PS,VA".split(",");
  const countryTranslations = {};
  try {
    const chineseRegionNames = new Intl.DisplayNames(["zh-CN"], { type: "region" });
    const englishRegionNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (const code of countryCodes) countryTranslations[chineseRegionNames.of(code)] = englishRegionNames.of(code);
  } catch {
    Object.assign(countryTranslations, {
      中国: "China", 英国: "United Kingdom", 美国: "United States", 加拿大: "Canada",
      澳大利亚: "Australia", 法国: "France", 德国: "Germany", 日本: "Japan",
      韩国: "South Korea", 新加坡: "Singapore"
    });
  }
  Object.assign(translations, countryTranslations);

  const patterns = [
    [/^(\d+) 件商品$/, (match) => `${match[1]} items`],
    [/^你好，(.+)$/, (match) => `Hello, ${match[1]}`],
    [/^欢迎，(.+)$/, (match) => `Welcome, ${match[1]}`],
    [/^卖家：(.+)$/, (match) => `Seller: ${match[1]}`],
    [/^与 (.+?) 沟通(.*)$/, (match) => `Chat with ${match[1]}${match[2]}`],
    [/^与你的资料匹配度 (\d+)%$/, (match) => `Profile match ${match[1]}%`],
    [/^当前预约：(\d+) 单处理中$/, (match) => `${match[1]} active booking request${match[1] === "1" ? "" : "s"}`],
    [/^已登记 · (.+)$/, (match) => `Registered · ${match[1]}`],
    [/^已上传：(.+)；重新选择文件可替换。$/, (match) => `Uploaded: ${match[1]}. Select another file to replace it.`],
    [/^(\d+) 位已申请$/, (match) => `${match[1]} applicants`],
    [/^(\d+) 位已抢单$/, (match) => `${match[1]} tutors claimed`],
    [/^预算 (.+)$/, (match) => `Budget ${match[1].replace(/(\d+(?:\.\d+)?)\s*元\/小时/g, "CNY $1/hour").replaceAll("/小时", "/hour")}`],
    [/^截止 (.+)$/, (match) => `Deadline ${match[1]}`],
    [/^认证电话：(.+?) · 认证微信：(.+)$/, (match) => `Verified phone: ${match[1]} · Verified WeChat: ${match[2]}`],
    [/^认证电话：(.+)$/, (match) => `Verified phone: ${match[1]}`],
    [/^认证微信：(.+)$/, (match) => `Verified WeChat: ${match[1]}`],
    [/^(.+?) · 认证电话：(.+?) · 认证微信：(.+)$/, (match) => `${match[1]} · Verified phone: ${match[2]} · Verified WeChat: ${match[3]}`],
    [/^提交时间：(.+)$/, (match) => `Submitted: ${match[1]}`],
    [/^最新说明：(.+)$/, (match) => `Latest note: ${match[1]}`],
    [/^进度已更新为 (\d+)%，学员端会同步显示。$/, (match) => `Progress updated to ${match[1]}%. It is now synced to the student portal.`],
    [/^需求 (.+) 已提交，联系方式仅店长端可见。$/, (match) => `Request ${match[1]} submitted. Contact details are visible only to the manager.`],
    [/^预约申请 (.+) 已发送给 (.+)，联系方式仅店长端可见。$/, (match) => `Booking request ${match[1]} was sent to ${match[2]}. Contact details are visible only to the manager.`],
    [/^已选择 (.+)，请填写并提交具体辅导需求。$/, (match) => `${match[1]} selected. Complete and submit the tutoring request.`],
    [/^已向 (.+) 发起预约申请，等待辅导员接单。$/, (match) => `Booking request sent to ${match[1]}; awaiting tutor acceptance.`],
    [/^(.+) 已接受预约申请，正在等待店长审核。$/, (match) => `${match[1]} accepted the booking request; awaiting manager review.`],
    [/^指定辅导员 · (.+)$/, (match) => `Preferred tutor · ${match[1]}`],
    [/^(.+) · 辅导员已接受，等待审核$/, (match) => `${match[1]} · Tutor accepted; awaiting review`],
    [/^(.+) · 等待辅导员接受预约申请$/, (match) => `${match[1]} · Awaiting tutor acceptance`],
    [/^资料已保存。你的平台编号是 (.+)，联系方式仅店长端可见。$/, (match) => `Profile saved. Your platform ID is ${match[1]}; contact details are visible only to the manager.`],
    [/^查看证明（(.+)）$/, (match) => `View credential (${match[1]})`],
    [/^(.+) 的清晰正面人脸照$/, (match) => `Clear front-facing photo of ${match[1]}`],
    [/^(.+) 的身份证照片$/, (match) => `ID photo of ${match[1]}`],
    [/^我 · (.+)$/, (match) => `Me · ${match[1]}`],
    [/^确定要下架“(.+)”吗？$/, (match) => `Remove “${match[1]}”?`]
  ];

  const controlledInlineKeys = [
    "商科与管理", "会计与金融", "经济学", "计算机科学", "数据科学与统计", "工程学", "教育学",
    "心理学", "法律", "医学与健康", "文学与语言", "艺术与设计", "传媒", "音乐专业"
  ];
  const inlineReplacements = [
    ...Object.entries(countryTranslations).sort((a, b) => b[0].length - a[0].length),
    ...controlledInlineKeys.map((key) => [key, translations[key]]),
    ["/小时", "/hour"],
    ["匹配 ", "Match "],
    [" · 已申请", " · Applied"],
    [" · 已抢单", " · Claimed"],
    [" · 商品已下架", " · Listing removed"]
  ];

  const textRecords = new WeakMap();
  const attributeRecords = new WeakMap();
  const translatedAttributes = ["placeholder", "aria-label", "title", "content", "alt"];
  let language = localStorage.getItem(languageKey) === "en" ? "en" : "zh";
  let titleSource = document.title;
  let languageButton = null;

  function preserveSpacing(source, translated) {
    const leading = source.match(/^\s*/)?.[0] || "";
    const trailing = source.match(/\s*$/)?.[0] || "";
    return `${leading}${translated}${trailing}`;
  }

  function translateValue(source) {
    const trimmed = String(source || "").trim();
    if (!trimmed) return source;
    if (translations[trimmed]) return preserveSpacing(source, translations[trimmed]);
    for (const [pattern, replacer] of patterns) {
      const match = trimmed.match(pattern);
      if (match) return preserveSpacing(source, replacer(match));
    }
    let translated = trimmed;
    for (const [from, to] of inlineReplacements) translated = translated.split(from).join(to);
    translated = translated.replace(/(\d+(?:\.\d+)?)\s*元\/hour/g, "CNY $1/hour");
    if (translated !== trimmed) return preserveSpacing(source, translated);
    return source;
  }

  function translateTextNode(node) {
    if (!node?.nodeValue || node.parentElement?.closest("script, style, [data-language-control]")) return;
    const current = node.nodeValue;
    if (node.parentElement?.tagName === "OPTION" && !node.parentElement.hasAttribute("value")) {
      node.parentElement.value = current.trim();
    }
    let record = textRecords.get(node);
    if (!record || current !== record.last) record = { source: current, last: current };
    const target = language === "en" ? translateValue(record.source) : record.source;
    record.last = target;
    textRecords.set(node, record);
    if (current !== target) node.nodeValue = target;
  }

  function translateAttributes(element) {
    if (!(element instanceof Element) || element.closest("[data-language-control]")) return;
    let records = attributeRecords.get(element) || {};
    for (const attribute of translatedAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute) || "";
      let record = records[attribute];
      if (!record || current !== record.last) record = { source: current, last: current };
      const target = language === "en" ? translateValue(record.source) : record.source;
      record.last = target;
      records[attribute] = record;
      if (current !== target) element.setAttribute(attribute, target);
    }
    attributeRecords.set(element, records);
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document.body) return;
    if (root instanceof Element) translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateAttributes(node);
      node = walker.nextNode();
    }
  }

  function updateLanguageButton() {
    if (!languageButton) return;
    languageButton.textContent = language === "zh" ? "English" : "中文";
    languageButton.setAttribute("aria-label", language === "zh" ? "Switch to English" : "切换到中文");
    languageButton.title = languageButton.getAttribute("aria-label");
  }

  function setLanguage(nextLanguage, persist = true) {
    language = nextLanguage === "en" ? "en" : "zh";
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = language === "en" ? (translations[titleSource] || titleSource) : titleSource;
    translateTree(document.body);
    updateLanguageButton();
    if (persist) localStorage.setItem(languageKey, language);
    window.dispatchEvent(new CustomEvent("campusloop:languagechange", { detail: { language } }));
  }

  function createLanguageButton() {
    languageButton = document.createElement("button");
    languageButton.id = "campusLanguageToggle";
    languageButton.type = "button";
    languageButton.dataset.languageControl = "true";
    const host = document.querySelector(".account-actions")
      || document.querySelector(".manager-header-actions")
      || document.querySelector(".dispatch-topbar")
      || document.body;
    if (host === document.body) languageButton.classList.add("language-toggle-floating");
    host.append(languageButton);
    languageButton.addEventListener("click", () => setLanguage(language === "zh" ? "en" : "zh"));
  }

  const style = document.createElement("style");
  style.textContent = `
    #campusLanguageToggle {
      min-width: 76px;
      min-height: 38px;
      padding: 0 13px;
      border: 1px solid rgba(101, 112, 132, .34);
      border-radius: 999px;
      background: rgba(255, 255, 255, .94);
      color: #1b2430;
      cursor: pointer;
      font: 800 13px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 6px 18px rgba(32, 42, 54, .09);
      white-space: nowrap;
    }
    #campusLanguageToggle:hover { border-color: #315f87; color: #315f87; }
    #campusLanguageToggle.language-toggle-floating { position: fixed; top: 18px; right: 18px; z-index: 1200; }
    @media (max-width: 720px) {
      #campusLanguageToggle { min-width: 66px; min-height: 34px; padding: 0 10px; }
      #campusLanguageToggle.language-toggle-floating { top: 12px; right: 12px; }
    }
  `;
  document.head.append(style);

  createLanguageButton();
  setLanguage(language, false);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateTextNode(mutation.target);
      if (mutation.type === "attributes") translateAttributes(mutation.target);
      for (const node of mutation.addedNodes || []) translateTree(node);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: translatedAttributes
  });
})();
