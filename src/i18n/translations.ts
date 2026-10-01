export type LanguageCode = "en" | "so" | "sw";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "so", label: "Somali", nativeName: "Soomaali", flag: "🇸🇴" },
  { code: "sw", label: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
];

export const UI_TRANSLATIONS: Record<
  LanguageCode,
  {
    // Intro & Header
    skipIntro: string;
    replayIntro: string;
    tableLabel: string;
    changeTable: string;
    editorialTagline: string;
    seasonalHighlight: string;
    exploreSignature: string;
    searchPlaceholder: string;
    allCategories: string;
    featuredBadge: string;
    popularBadge: string;
    unavailableBadge: string;
    prepTimeLabel: string;
    // Food Item Detail & Customization
    ingredientsLabel: string;
    allergensLabel: string;
    customizeOrder: string;
    requiredBadge: string;
    optionalBadge: string;
    selectUpTo: string;
    selectAtLeast: string;
    specialInstructions: string;
    specialInstructionsPlaceholder: string;
    quantityLabel: string;
    addToOrder: string;
    addedToOrderToast: string;
    itemUnavailableNote: string;
    // Cart & Checkout
    yourOrderCart: string;
    emptyCartTitle: string;
    emptyCartSubtitle: string;
    browseMenu: string;
    subtotal: string;
    serviceCharge: string;
    tax: string;
    total: string;
    estimatedPrepTime: string;
    minutesShort: string;
    paymentNotice: string;
    placeOrder: string;
    confirmYourOrder: string;
    confirmOrderSubtitle: string;
    confirmAndSend: string;
    backToCart: string;
    orderNoteLabel: string;
    orderNotePlaceholder: string;
    submittingOrder: string;
    // Order Tracking & Multiple Orders per Table
    tableOrdersTitle: string;
    activeOrdersCount: string;
    orderReceivedTitle: string;
    orderSentSubtitle: string;
    waitingForStaff: string;
    statusPending: string;
    statusAccepted: string;
    statusPreparing: string;
    statusReady: string;
    statusCompleted: string;
    statusCancelled: string;
    statusDescPending: string;
    statusDescAccepted: string;
    statusDescPreparing: string;
    statusDescReady: string;
    statusDescCompleted: string;
    statusDescCancelled: string;
    orderMoreItems: string;
    viewActiveOrders: string;
    noTableOrdersYet: string;
    // Restaurant Closed & Error States
    currentlyClosedTitle: string;
    currentlyClosedSubtitle: string;
    openingHoursLabel: string;
    invalidTableTitle: string;
    invalidTableSubtitle: string;
    selectActiveTable: string;
    emptyMenuTitle: string;
    emptyMenuSubtitle: string;
    networkErrorTitle: string;
    networkErrorSubtitle: string;
    retryAction: string;
    offlineBanner: string;
    // Footer & Staff Portal Links
    hospitalityExperience: string;
    staffPortal: string;
    kitchenDisplay: string;
    adminConsole: string;
  }
> = {
  en: {
    skipIntro: "Skip →",
    replayIntro: "Intro Film",
    tableLabel: "TABLE",
    changeTable: "Switch Table",
    editorialTagline: "CULINARY CRAFTSMANSHIP & SPECIALTY ROASTERY",
    seasonalHighlight: "Chef's Seasonal Selection",
    exploreSignature: "Discover Dish",
    searchPlaceholder: "Search dishes, ingredients, or pairings…",
    allCategories: "All Collections",
    featuredBadge: "Signature",
    popularBadge: "Most Loved",
    unavailableBadge: "Currently Unavailable",
    prepTimeLabel: "Prep",
    ingredientsLabel: "Key Ingredients",
    allergensLabel: "Allergens & Dietary",
    customizeOrder: "Bespoke Preferences",
    requiredBadge: "Required",
    optionalBadge: "Optional",
    selectUpTo: "Select up to",
    selectAtLeast: "Select at least",
    specialInstructions: "Kitchen Note",
    specialInstructionsPlaceholder: "E.g., sauce on the side, extra warm…",
    quantityLabel: "Quantity",
    addToOrder: "Add to Order",
    addedToOrderToast: "Added to your table order",
    itemUnavailableNote: "This dish is momentarily unavailable from the kitchen.",
    yourOrderCart: "Your Table Selection",
    emptyCartTitle: "Your table selection is empty",
    emptyCartSubtitle: "Explore our culinary collections to begin curating your dining experience.",
    browseMenu: "Explore Menu",
    subtotal: "Subtotal",
    serviceCharge: "Service Charge",
    tax: "VAT (Included/Applicable)",
    total: "Total",
    estimatedPrepTime: "Estimated Preparation",
    minutesShort: "mins",
    paymentNotice: "No online payment required. Settle comfortably at your table when ready.",
    placeOrder: "Place Order",
    confirmYourOrder: "Confirm Table Order",
    confirmOrderSubtitle: "Please review your selections for your table before sending directly to our staff.",
    confirmAndSend: "Send Order to Restaurant",
    backToCart: "Adjust Selection",
    orderNoteLabel: "Table Note for Waitstaff (Optional)",
    orderNotePlaceholder: "E.g., serve coffee together with dessert…",
    submittingOrder: "Sending to restaurant…",
    tableOrdersTitle: "Table Session Orders",
    activeOrdersCount: "Active Orders",
    orderReceivedTitle: "Order received.",
    orderSentSubtitle: "Your order has been sent to the restaurant.",
    waitingForStaff: "Waiting for staff confirmation…",
    statusPending: "Waiting for restaurant",
    statusAccepted: "Order accepted",
    statusPreparing: "Preparing your order",
    statusReady: "Your order is ready",
    statusCompleted: "Completed",
    statusCancelled: "Order cancelled",
    statusDescPending: "Our floor staff has been notified and will confirm your order shortly.",
    statusDescAccepted: "Confirmed by our hospitality team and queued for the kitchen.",
    statusDescPreparing: "Our chefs and baristas are crafting your selection right now.",
    statusDescReady: "Prepared and plated—being brought directly to your table.",
    statusDescCompleted: "Served to your table. Enjoy your dining experience at Amorino.",
    statusDescCancelled: "Please speak with your table host for assistance.",
    orderMoreItems: "Order Additional Items",
    viewActiveOrders: "Track Orders",
    noTableOrdersYet: "No orders placed for this table session yet.",
    currentlyClosedTitle: "We’re currently closed.",
    currentlyClosedSubtitle: "You are welcome to browse our culinary catalogue. Table ordering will resume during our service hours.",
    openingHoursLabel: "Service Hours",
    invalidTableTitle: "Table Not Recognized",
    invalidTableSubtitle: "The scanned QR table code is inactive or unavailable. Please scan the QR emblem on your table or select your table below.",
    selectActiveTable: "Select Your Table",
    emptyMenuTitle: "The menu is being prepared.",
    emptyMenuSubtitle: "Our culinary team is currently updating today's selections.",
    networkErrorTitle: "Something went wrong.",
    networkErrorSubtitle: "Please try again.",
    retryAction: "Retry",
    offlineBanner: "Connection interrupted — viewing cached menu. Reconnecting automatically…",
    hospitalityExperience: "Amorino Cafe & Restaurant • Kenya",
    staffPortal: "Staff Floor",
    kitchenDisplay: "Kitchen KDS",
    adminConsole: "Admin Suite",
  },
  so: {
    skipIntro: "Ka gudub →",
    replayIntro: "Muuqaalka Bilowga",
    tableLabel: "MIISKA",
    changeTable: "Beddel Miiska",
    editorialTagline: "FARSHAXANKA CUNNADA & QAXWAHA GAARKA AH",
    seasonalHighlight: "Xulashada Gaarka ah ee Kuugga",
    exploreSignature: "Eeg Cunnadan",
    searchPlaceholder: "Raadi cunnooyinka, waxyaabaha ku jira…",
    allCategories: "Dhammaan Qaybaha",
    featuredBadge: "Gaar ah",
    popularBadge: "Loogu Jecel Yahay",
    unavailableBadge: "Hadda Lama Heli Karo",
    prepTimeLabel: "Diyaarinta",
    ingredientsLabel: "Waxyaabaha Muhiimka ah",
    allergensLabel: "Xasaasiyadda & Cuntada",
    customizeOrder: "Doorashooyinkaaga Gaarka ah",
    requiredBadge: "Waajib",
    optionalBadge: "Ikhtiyaari",
    selectUpTo: "Dooro ilaa",
    selectAtLeast: "Ugu yaraan dooro",
    specialInstructions: "Fariin Jikada",
    specialInstructionsPlaceholder: "Tusaale: suugada gees dhig, kulayl dheeraad ah…",
    quantityLabel: "Tirada",
    addToOrder: "Ku dar Dalabka",
    addedToOrderToast: "Waa lagu daray dalabka miiskaaga",
    itemUnavailableNote: "Cunnadan hadda lagama heli karo jikada.",
    yourOrderCart: "Xulashada Miiskaaga",
    emptyCartTitle: "Dambiisha miiskaagu waa madhan tahay",
    emptyCartSubtitle: "Sahami liiska cunnooyinkayaga si aad u bilowdo dalabkaaga.",
    browseMenu: "Eeg Liiska Cunnada",
    subtotal: "Wadarta Hore",
    serviceCharge: "Khidmadda Adeegga",
    tax: "Canshuurta",
    total: "Wadarta Guud",
    estimatedPrepTime: "Waqtiga Diyaarinta",
    minutesShort: "daqiiqo",
    paymentNotice: "Lacag bixin online ah looma baahna. Ku bixi miiskaaga marka laguu adeego.",
    placeOrder: "Gudbi Dalabka",
    confirmYourOrder: "Xaqiiji Dalabka Miiska",
    confirmOrderSubtitle: "Fadlan dib u eeg xulashadaada ka hor inta aan loo dirin shaqaalaha makhaayadda.",
    confirmAndSend: "U Dir Dalabka Makhaayadda",
    backToCart: "Wax ka beddel",
    orderNoteLabel: "Fariin ku socota Shaqaalaha Miiska (Ikhtiyaari)",
    orderNotePlaceholder: "Tusaale: qaxwaha la keen macmacaanka…",
    submittingOrder: "Waa la dirayaa…",
    tableOrdersTitle: "Dalabyada Miiska",
    activeOrdersCount: "Dalabyada Socda",
    orderReceivedTitle: "Dalabka waa la helay.",
    orderSentSubtitle: "Dalabkaaga waxaa loo diray makhaayadda.",
    waitingForStaff: "Waxaa la sugayaa xaqiijinta shaqaalaha…",
    statusPending: "Waxaa la sugayaa makhaayadda",
    statusAccepted: "Dalabka waa la aqbalay",
    statusPreparing: "Waa la diyaarinayaa dalabkaaga",
    statusReady: "Dalabkaagu waa diyaar",
    statusCompleted: "Waa la dhammaystiray",
    statusCancelled: "Dalabka waa la joojiyay",
    statusDescPending: "Shaqaalahayaga ayaa la ogeysiiyay waxayna xaqiijin doonaan dalabkaaga goor dhow.",
    statusDescAccepted: "Kooxdayada soo dhawaynta ayaa xaqiijisay waxaana loo gudbiyay jikada.",
    statusDescPreparing: "Cunto-kariyeyaashayada ayaa hadda diyaarinaya dalabkaaga.",
    statusDescReady: "Waa diyaar—waxaa hadda laguugu keenayaa miiskaaga.",
    statusDescCompleted: "Miiskaaga ayaa la keenay. Ku raaxayso waqtigaaga Amorino.",
    statusDescCancelled: "Fadlan la hadal shaqaalaha miiska si laguu caawiyo.",
    orderMoreItems: "Dalbo Cunno Kale",
    viewActiveOrders: "La soco Dalabka",
    noTableOrdersYet: "Weli wax dalab ah lagama samayn miiskan.",
    currentlyClosedTitle: "Hadda waan xiranahay.",
    currentlyClosedSubtitle: "Waad daawan kartaa liiska cunnadayada. Dalbashadu waxay dib u bilaaban doontaa saacadaha shaqada.",
    openingHoursLabel: "Saacadaha Shaqada",
    invalidTableTitle: "Miiska Lama Aqoonsan",
    invalidTableSubtitle: "Koodhka miiska ee la sawiray ma shaqaynayo. Fadlan dooro miiskaaga hoos.",
    selectActiveTable: "Dooro Miiskaaga",
    emptyMenuTitle: "Liiska cunnada waa la diyaarinayaa.",
    emptyMenuSubtitle: "Kooxdayada cunnada ayaa hadda cusboonaysiinaysa liiska maanta.",
    networkErrorTitle: "Wax baa khaldamay.",
    networkErrorSubtitle: "Fadlan isku day mar kale.",
    retryAction: "Isku day mar kale",
    offlineBanner: "Khadka ayaa go'ay — waxaad arkeysaa liiska kaydsan. Dib ayuu u xirmi doonaa…",
    hospitalityExperience: "Amorino Cafe & Restaurant • Kenya",
    staffPortal: "Qaybta Shaqaalaha",
    kitchenDisplay: "Shaashadda Jikada",
    adminConsole: "Maamulka Guud",
  },
  sw: {
    skipIntro: "Ruka →",
    replayIntro: "Filamu ya Utangulizi",
    tableLabel: "MEZA",
    changeTable: "Badili Meza",
    editorialTagline: "SANAA YA UPISHI NA KAHAWA YA KIFAHARI",
    seasonalHighlight: "Chaguo Maalum la Mpishi Mkuu",
    exploreSignature: "Tazama Mlo",
    searchPlaceholder: "Tafuta vyakula, viungo, au vinywaji…",
    allCategories: "Mikusanyiko Yote",
    featuredBadge: "Maalum",
    popularBadge: "Pendwa Zaidi",
    unavailableBadge: "Haipatikani Kwa Sasa",
    prepTimeLabel: "Maandalizi",
    ingredientsLabel: "Viungo Muhimu",
    allergensLabel: "Mzio na Lishe",
    customizeOrder: "Mapendeleo Yako Maalum",
    requiredBadge: "Lazima",
    optionalBadge: "Hiari",
    selectUpTo: "Chagua hadi",
    selectAtLeast: "Chagua angalau",
    specialInstructions: "Ujumbe kwa Jiko",
    specialInstructionsPlaceholder: "Mfano: mchuzi pembeni, pilipili kidogo…",
    quantityLabel: "Idadi",
    addToOrder: "Ongeza Kwenye Oda",
    addedToOrderToast: "Imeongezwa kwenye oda ya meza yako",
    itemUnavailableNote: "Chakula hiki hakipatikani kwa sasa jikoni.",
    yourOrderCart: "Chaguo la Meza Yako",
    emptyCartTitle: "Kikapu cha meza yako kiko tupu",
    emptyCartSubtitle: "Chunguza orodha yetu ya vyakula vya kifahari ili kuanza kuagiza.",
    browseMenu: "Tazama Menyu",
    subtotal: "Jumla Ndogo",
    serviceCharge: "Ada ya Huduma",
    tax: "Kodi",
    total: "Jumla Kuu",
    estimatedPrepTime: "Muda wa Maandalizi",
    minutesShort: "dakika",
    paymentNotice: "Hakuna malipo ya mtandaoni. Lipia kwa utulivu mezani pako baada ya kuhudumiwa.",
    placeOrder: "Tuma Oda",
    confirmYourOrder: "Thibitisha Oda ya Meza",
    confirmOrderSubtitle: "Tafadhali kagua chaguo lako kabla ya kutuma moja kwa moja kwa wahudumu wetu.",
    confirmAndSend: "Tuma Oda kwa Mgahawa",
    backToCart: "Rekebisha Chaguo",
    orderNoteLabel: "Ujumbe kwa Mhudumu wa Meza (Hiari)",
    orderNotePlaceholder: "Mfano: leta kahawa pamoja na kitindamlo…",
    submittingOrder: "Inatuma oda…",
    tableOrdersTitle: "Oda za Meza Hii",
    activeOrdersCount: "Oda Zinazoendelea",
    orderReceivedTitle: "Oda imepokelewa.",
    orderSentSubtitle: "Oda yako imetumwa kwenye mgahawa.",
    waitingForStaff: "Inasubiri uthibitisho wa wahudumu…",
    statusPending: "Inasubiri mgahawa",
    statusAccepted: "Oda imekubaliwa",
    statusPreparing: "Tunaandaa oda yako",
    statusReady: "Oda yako iko tayari",
    statusCompleted: "Imekamilika",
    statusCancelled: "Oda imesitishwa",
    statusDescPending: "Wahudumu wetu wamearifiwa na watathibitisha oda yako hivi punde.",
    statusDescAccepted: "Imethibitishwa na timu yetu ya ukarimu na imetumwa jikoni.",
    statusDescPreparing: "Wapishi na wataalamu wetu wa kahawa wanaandaa oda yako sasa hivi.",
    statusDescReady: "Imeandaliwa kwa ustadi—inaletwa moja kwa moja kwenye meza yako.",
    statusDescCompleted: "Imeletwa mezani pako. Furahia chakula chako hapa Amorino.",
    statusDescCancelled: "Tafadhali wasiliana na mhudumu wa meza yako kwa msaada.",
    orderMoreItems: "Agiza Vitu Zaidi",
    viewActiveOrders: "Fuatilia Oda",
    noTableOrdersYet: "Bado hakuna oda iliyowekwa kwenye meza hii.",
    currentlyClosedTitle: "Tumefunga kwa sasa.",
    currentlyClosedSubtitle: " Unakaribishwa kutazama menyu yetu. Kuagiza kutaendelea wakati wa saa zetu za kazi.",
    openingHoursLabel: "Saa za Huduma",
    invalidTableTitle: "Meza Haijatambuliwa",
    invalidTableSubtitle: "Msimbo wa QR wa meza hauko hai. Tafadhali chagua meza yako hapa chini.",
    selectActiveTable: "Chagua Meza Yako",
    emptyMenuTitle: "Menyu inaandaliwa.",
    emptyMenuSubtitle: "Timu yetu ya wapishi inaboresha chaguo za leo.",
    networkErrorTitle: "Kuna tatizo limetokea.",
    networkErrorSubtitle: "Tafadhali jaribu tena.",
    retryAction: "Jaribu Tena",
    offlineBanner: "Mtandao umekatika — unatazama menyu iliyohifadhiwa. Inaunganisha tena…",
    hospitalityExperience: "Amorino Cafe & Restaurant • Kenya",
    staffPortal: "Ukumbi wa Wahudumu",
    kitchenDisplay: "Skrini ya Jikoni",
    adminConsole: "Utawala Mkuu",
  },
};

export function localizeField(
  entity: Record<string, any> | null | undefined,
  field: string,
  lang: LanguageCode
): string {
  if (!entity) return "";
  if (lang === "so" && entity[`${field}_so`]) {
    return entity[`${field}_so`];
  }
  if (lang === "sw" && entity[`${field}_sw`]) {
    return entity[`${field}_sw`];
  }
  return entity[field] || "";
}
