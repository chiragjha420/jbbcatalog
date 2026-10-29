# JBB Product Gallery 🎱 📸

A fast, locally stored, offline-first product-photo catalogue designed specifically for sales teams selling snooker tables, pool tables, cue sticks, billiard accessories, furniture, and spare parts.

Built with **React Native + Expo (SDK 58) + TypeScript + SQLite FTS5 + Zustand**.

---

## 🚀 Key Features

- **100% Offline-First & Local Storage**:
  - Zero external servers, cloud databases, logins, or telemetry.
  - Complete catalogue metadata stored in device SQLite database.
  - High-performance **FTS5 (Full-Text Search)** virtual tables with weighted relevance ranking.
  - Original images stored in permanent app documents folder; 400px optimized thumbnails generated on import for 60fps scrolling.

- **Fastest WhatsApp Sharing Flow**:
  1. Open app
  2. Search product (e.g. `12 ft snooker`, `royal`, `cue`)
  3. Tap product
  4. View full-resolution photo carousel (swipe, zoom, thumbnail strip)
  5. Multi-select photos (e.g. 1, 3, 5, 8)
  6. Tap **Share** → Native OS share sheet opens with selected photos ready to send directly into WhatsApp, WhatsApp Business, AirDrop, etc.

- **Save / Download to Device Photos**:
  - Clean one-tap download into phone's photo gallery under a dedicated "JBB Products" album.
  - Non-technical, human-friendly permission explanations.

- **Intelligent Keyword Engine & Duplicate Detection**:
  - Automatically suggests synonyms and measurement variants (e.g., `12 ft` ↔ `12ft` ↔ `12 feet` ↔ `12'`).
  - Warns salespeople if a similar product already exists while allowing "Create anyway".

- **Clean Apple Photos Aesthetic**:
  - Minimalist layout with generous whitespace, high contrast, and large imagery.
  - No bloated ERP tables, CRM pipelines, or neon gradients.

- **Backup, Restore & Device-to-Device Transfer**:
  - One-tap "Backup Library" exports a portable self-contained archive (metadata + packed image assets).
  - Can be sent directly over WhatsApp, AirDrop, Google Drive, or Files when a salesperson gets a new phone.

- **Zero Mock Data on Fresh Install**:
  - Fresh installations launch completely empty (0 products, 0 photos, 0 categories).
  - Minimal, human-friendly empty states that guide the user to create their first product.

---

## 📁 Project Structure

```
jbb-product-gallery/
├── app/
│   ├── _layout.tsx                 # Root layout with DB init and safe area
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Bottom tab bar (Search, Categories, Favorites, Settings)
│   │   ├── index.tsx               # Home screen: Search bar, recent items, photo grid
│   │   ├── categories.tsx          # Category manager and browse list
│   │   ├── favorites.tsx           # Quick-access starred products
│   │   └── settings.tsx            # Disk space stats, Backup/Restore, Wipe library
│   ├── product/
│   │   ├── [id].tsx                # Product Gallery: Large carousel, multi-select, Share, Download
│   │   └── edit.tsx                # Edit product: Add/delete/reorder photos, keywords, SKU
│   ├── add-product.tsx             # Add product modal: Camera/gallery picker, auto-keywords, duplicate detector
│   └── category/
│       └── [id].tsx                # Products in specific category
├── src/
│   ├── components/
│   │   ├── SearchBar.tsx           # Instant as-you-type search input
│   │   ├── ProductCard.tsx         # Clean 2-column visual grid card
│   │   ├── EmptyState.tsx          # Minimal, human-friendly empty views
│   │   ├── ImageCarousel.tsx       # Large swipeable carousel with 1/N counter & zoom
│   │   ├── SelectionBar.tsx        # Floating multi-select action bar (Share / Download)
│   │   ├── KeywordTagsInput.tsx    # Tag chips input with auto-suggestions
│   │   └── CategoryPickerModal.tsx # Quick category selector & inline creator
│   ├── db/
│   │   ├── database.ts             # SQLite initialization, schema, FTS5 table & triggers
│   │   ├── productsRepository.ts   # Product CRUD, ranked search, duplicate detection, stats
│   │   └── categoriesRepository.ts # Category CRUD
│   ├── services/
│   │   ├── imageService.ts         # Local filesystem storage, 400px thumbnail generator, disk usage
│   │   ├── shareService.ts         # WhatsApp & OS native multi-image sharing
│   │   ├── mediaService.ts         # Download/save photos to device gallery
│   │   ├── backupService.ts        # Portable JSON+base64 backup export & import restore
│   │   └── keywordSuggester.ts     # Intelligent measurement & billiard synonym engine
│   ├── store/
│   │   └── useLibraryStore.ts      # Zustand global reactive state
│   ├── constants/
│   │   └── theme.ts                # Typography, colors, and design tokens
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── app.json                        # Expo configuration & native permissions
├── eas.json                        # Expo Application Services build configuration
└── package.json
```

---

## 🛠️ Getting Started

### 1. Start Development Server
```bash
npx expo start
```
Scan the QR code with **Expo Go** on your iPhone or Android phone.

### 2. Run on Android Simulator or Device
```bash
npm run android
```

### 3. Run on iOS Simulator (macOS required)
```bash
npm run ios
```

### 4. Build Production APK / AAB / IPA with EAS
```bash
# Production Android App Bundle for Google Play
eas build -p android --profile production

# Test APK for Android device installation
eas build -p android --profile preview

# iOS production build
eas build -p ios --profile production
```
