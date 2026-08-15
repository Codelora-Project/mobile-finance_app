\# PRD Teknis Final / Coding Agent Implementation Specification

\## Personal Expense, Receipt OCR \& Reimbursement App — MVP



\---



\# 0. Cara Menggunakan Dokumen Ini



Dokumen ini adalah \*\*single source of truth\*\* untuk implementasi MVP aplikasi mobile personal finance yang berfokus pada:



1\. pencatatan transaksi sehari-hari;

2\. pemindaian receipt menggunakan OCR;

3\. pengelompokan transaksi;

4\. ringkasan pengeluaran;

5\. pembuatan reimbursement/expense claim;

6\. export claim menjadi PDF lengkap dengan receipt.



Dokumen ini menggabungkan:



\- Product / MVP Specification;

\- Data Model \& Database Specification;

\- Technical Architecture \& Dependency Specification;

\- UI/UX \& Screen Specification;

\- Implementation Phases;

\- Acceptance Criteria;

\- Testing Matrix;

\- Definition of Done;

\- Non-Goals;

\- Coding Agent Rules.



Coding Agent harus menganggap dokumen ini sebagai \*\*implementation contract\*\*.



Jika terdapat ketidakjelasan kecil, pilih solusi paling sederhana yang konsisten dengan dokumen ini.



Jika terdapat blocker teknis yang membutuhkan perubahan terhadap keputusan fundamental, \*\*jangan diam-diam mengganti architecture\*\*. Jelaskan blocker dan proposed change terlebih dahulu.



\---



\# 1. Product Summary



Aplikasi adalah:



> \*\*Local-first personal expense capture and documentation app\*\* untuk mencatat transaksi dengan cepat, memindai receipt menggunakan OCR, melihat ringkasan pengeluaran, dan membuat reimbursement report dari transaksi tertentu.



Core flow:



```text

CAPTURE

Manual / Camera / Gallery

&#x20;       ↓

ORGANIZE

Category / Payment Method / Receipt

&#x20;       ↓

UNDERSTAND

History / Search / Monthly Summary

&#x20;       ↓

DOCUMENT

Claim / Receipt Attachments / PDF

```



\---



\# 2. Product Positioning



Aplikasi bukan:



\- mobile banking;

\- accounting software;

\- investment tracker;

\- tax application;

\- bank account aggregator;

\- enterprise reimbursement platform;

\- budgeting platform kompleks.



Aplikasi berfokus pada:



```text

Expense Tracking

\+

Receipt Management

\+

OCR-assisted Entry

\+

Reimbursement Claims

```



\---



\# 3. Primary Users



Target awal:



\- mahasiswa;

\- pekerja;

\- freelancer;

\- pengguna umum;

\- pengguna dengan banyak pengeluaran kecil;

\- pengguna yang sesekali perlu mendokumentasikan pengeluaran untuk reimbursement.



\---



\# 4. Product Goals



MVP dianggap berhasil jika pengguna dapat:



1\. mencatat expense dalam beberapa detik;

2\. mencatat income sederhana;

3\. scan receipt melalui camera;

4\. import receipt dari gallery;

5\. menggunakan OCR untuk membantu mengisi transaksi;

6\. memperbaiki hasil OCR sebelum Save;

7\. tetap menyimpan transaksi jika OCR gagal;

8\. mencari dan memfilter transaksi;

9\. melihat pengeluaran bulanan;

10\. menandai expense sebagai reimbursable;

11\. membuat Claim;

12\. melihat receipt yang missing;

13\. mengubah status Claim;

14\. generate reimbursement PDF;

15\. share PDF;

16\. melakukan seluruh core flow secara offline.



\---



\# 5. Core Product Principles



Urutan prioritas ketika terjadi konflik:



```text

1\. Data tidak hilang

2\. User dapat menyelesaikan task

3\. Transaction entry cepat

4\. OCR mudah diperbaiki

5\. Claim akurat

6\. UI konsisten

7\. Visual polish

```



\---



\# 6. UX Philosophy



Aplikasi harus terasa seperti:



> \*\*alat yang cepat dan dapat dipercaya, bukan demo teknologi.\*\*



Hindari:



\- AI gimmick;

\- fake financial insights;

\- excessive animations;

\- giant dashboard cards;

\- excessive gradients;

\- glassmorphism;

\- decorative charts;

\- motivational fintech copy.



Gunakan:



\- hierarchy;

\- whitespace;

\- typography;

\- explicit labels;

\- concise copy;

\- predictable behavior.



\---



\# 7. Architectural Philosophy



Gunakan:



> \*\*feature-oriented modular application dengan thin infrastructure layer.\*\*



Concept:



```text

Presentation

Routes / Screens / Components

&#x20;       ↓

Feature / Domain Logic

Validation / Services / Hooks

&#x20;       ↓

Infrastructure

SQLite / OCR / FileSystem / PDF

```



Jangan gunakan:



\- Clean Architecture berlapis-lapis;

\- DDD kompleks;

\- CQRS formal;

\- Event Sourcing;

\- generic repository abstraction;

\- dependency injection framework;

\- microservices;

\- backend placeholder.



\---



\# 8. Platform \& Development Target



Primary MVP platform:



```text

Android

```



Primary development device:



```text

Pixel 7 Android Emulator

Android 16 / API 36

Google Play image

```



Physical Android device tidak diperlukan untuk development awal, tetapi wajib dilakukan sebelum aplikasi dianggap production-ready.



\---



\# 9. Technology Stack



\## Core



```text

React Native

Expo SDK 57

React Native 0.86

TypeScript

npm

```



\## Navigation



```text

Expo Router

```



\## Database



```text

expo-sqlite

```



\## File Storage



```text

expo-file-system

```



\## Camera



```text

expo-camera

```



\## Gallery



```text

expo-image-picker

```



\## OCR



```text

Google ML Kit Text Recognition

@infinitered/react-native-mlkit-text-recognition

```



\## Forms



```text

react-hook-form

```



\## Validation



```text

zod

@hookform/resolvers

```



\## UI



```text

React Native primitives

StyleSheet

@expo/ui

expo-symbols

```



\## PDF



```text

expo-print

```



\## Sharing



```text

expo-sharing

```



\## Testing



```text

Jest

jest-expo

@testing-library/react-native

```



\## Code Quality



```text

TypeScript strict

ESLint

eslint-config-expo

Prettier

Expo Doctor

```



\---



\# 10. Explicitly Rejected Dependencies



Jangan tambahkan ke MVP:



```text

Redux

Redux Toolkit

Zustand

MobX

Jotai

TanStack Query

SWR

Axios



Drizzle

Prisma

TypeORM

Realm

WatermelonDB



NativeWind

Tamagui

React Native Paper

NativeBase

Gluestack



VisionCamera



Moment

Day.js

date-fns

Luxon



Firebase

Supabase

Sentry

Mixpanel

PostHog

Amplitude



Lottie



OpenAI API

Gemini API



AsyncStorage

```



Dependency baru hanya boleh ditambahkan jika benar-benar menyelesaikan requirement nyata yang tidak dapat diselesaikan dengan stack yang ada.



\---



\# 11. Development Runtime



Gunakan:



```text

Expo Development Build

```



Bukan Expo Go setelah dependency native OCR digunakan.



Initial build:



```bash

npx expo run:android

```



Development server:



```bash

npx expo start --dev-client

```



Rebuild native diperlukan jika terjadi perubahan:



\- native dependency;

\- config plugin;

\- Expo SDK;

\- native configuration.



\---



\# 12. Package Installation Rules



Expo packages:



```bash

npx expo install <package>

```



Third-party package:



```bash

npm install <package>

```



Commit:



```text

package-lock.json

```



Setelah native dependency berubah:



```bash

npx expo-doctor@latest

```



\---



\# 13. State Management Strategy



Tidak menggunakan global state management library.



Gunakan:



\### Local UI state



```text

useState

useReducer

```



\### Form state



```text

React Hook Form

```



\### Persistent state



```text

SQLite

```



\### Scoped receipt flow state



React Context hanya dalam Receipt flow.



Bukan global app store.



\---



\# 14. Folder Structure



Gunakan baseline berikut:



```text

src/

│

├── app/

│   ├── \_layout.tsx

│   ├── add.tsx

│   │

│   ├── (tabs)/

│   │   ├── \_layout.tsx

│   │   ├── index.tsx

│   │   ├── transactions.tsx

│   │   ├── claims.tsx

│   │   └── settings.tsx

│   │

│   ├── transactions/

│   │   ├── new.tsx

│   │   ├── \[id].tsx

│   │   └── \[id]/

│   │       └── edit.tsx

│   │

│   ├── receipt/

│   │   ├── \_layout.tsx

│   │   ├── camera.tsx

│   │   └── review.tsx

│   │

│   ├── claims/

│   │   ├── new.tsx

│   │   └── \[id].tsx

│   │

│   ├── categories/

│   │   └── index.tsx

│   │

│   └── payment-methods/

│       └── index.tsx

│

├── features/

│   ├── home/

│   ├── transactions/

│   ├── receipts/

│   ├── claims/

│   ├── categories/

│   ├── payment-methods/

│   └── settings/

│

├── db/

│   ├── database.ts

│   ├── migrations/

│   ├── seeds.ts

│   └── queries/

│

├── components/

│   └── ui/

│

├── lib/

│   ├── money.ts

│   ├── dates.ts

│   ├── strings.ts

│   ├── errors.ts

│   └── html.ts

│

├── theme/

│   ├── colors.ts

│   ├── spacing.ts

│   ├── typography.ts

│   └── radius.ts

│

└── types/

```



\---



\# 15. Folder Rules



Jangan membuat folder generic dumping ground seperti:



```text

helpers/

managers/

controllers/

repositories/

factories/

```



Jika logic khusus receipt:



```text

features/receipts/

```



Jika benar-benar generic:



```text

lib/

```



\---



\# 16. Route Rules



Route file harus tipis.



Route menangani:



\- parameters;

\- navigation;

\- screen composition.



Route tidak boleh berisi:



\- SQL panjang;

\- OCR parsing;

\- business rule;

\- PDF generation;

\- filesystem logic.



\---



\# 17. Navigation Structure



Bottom tabs:



```text

Home

Transactions

\+

Claims

Settings

```



`+` adalah action, bukan tab destination permanen.



Tekan `+`:



```text

Add Transaction



Enter Manually

Scan Receipt

Import Receipt

```



\---



\# 18. Persistent vs Full-Screen Navigation



Tab bar tampil pada:



\- Home;

\- Transactions;

\- Claims;

\- Settings.



Tab bar disembunyikan pada:



\- Add Transaction;

\- Manual Transaction;

\- Camera;

\- Receipt Review;

\- Transaction Detail;

\- Transaction Edit;

\- New Claim;

\- Claim Detail;

\- Receipt Viewer;

\- Category Editor;

\- Payment Method Editor.



\---



\# 19. Core Entity Model



Entity final MVP:



```text

categories

payment\_methods

transactions

receipts

claims

claim\_items

app\_settings

```



Relationship:



```text

Category

&#x20;   │

&#x20;   └── Transactions

&#x20;           │

&#x20;           ├── Payment Method

&#x20;           ├── Receipt 0..1

&#x20;           └── Claim Item 0..1

&#x20;                      │

&#x20;                      └── Claim

```



\---



\# 20. Database Engine



Gunakan:



```text

SQLite

```



SQLite adalah single source of truth untuk structured data.



Receipt image disimpan di filesystem.



\---



\# 21. Database Runtime Configuration



Pada initialization:



```sql

PRAGMA foreign\_keys = ON;

PRAGMA journal\_mode = WAL;

```



Gunakan:



```text

PRAGMA user\_version

```



untuk migration.



\---



\# 22. Migration Strategy



Sequential migrations:



```text

001\_initial

002\_future\_change

003\_future\_change

```



Migration harus:



\- deterministic;

\- sequential;

\- tidak reset user data;

\- tidak drop seluruh DB untuk production.



Tidak menggunakan migration framework eksternal.



\---



\# 23. ID Strategy



Gunakan:



```sql

INTEGER PRIMARY KEY

```



Tidak perlu UUID pada MVP.



Jangan gunakan primary key sebagai business identifier.



\---



\# 24. Timestamp Strategy



Metadata:



```text

created\_at

updated\_at

```



disimpan sebagai Unix milliseconds:



```text

INTEGER

```



Transaction date:



```text

occurred\_at

timezone\_offset\_minutes

local\_date

```



`local\_date`:



```text

YYYY-MM-DD

```



\---



\# 25. Currency Architecture



MVP UI menggunakan:



```text

IDR

```



tetapi database currency-aware.



Transaction:



```text

amount\_minor

currency\_code

```



Contoh:



```text

Rp35.000



amount\_minor = 35000

currency\_code = IDR

```



```text

$12.50



amount\_minor = 1250

currency\_code = USD

```



\---



\# 26. Money Rules



Gunakan integer minor units.



Tidak menggunakan:



```text

FLOAT

REAL

DOUBLE

```



untuk financial arithmetic.



Semua amount positif.



Expense sign hanyalah presentation:



```text

expense 35000 → -Rp35.000

income 35000  → +Rp35.000

```



\---



\# 27. Currency Future-Proofing Contract



MVP:



```text

default\_currency\_code = IDR

```



Changing default currency di masa depan tidak mengubah existing transaction.



Receipt mengikuti transaction currency.



Satu Claim hanya boleh berisi satu currency.



Tidak ada:



\- exchange rate;

\- automatic conversion;

\- multi-currency claim.



\---



\# 28. Money Utility



Centralized:



```text

src/lib/money.ts

```



Minimal:



```text

parseMoneyInput()

formatMoney()

getCurrencyFractionDigits()

assertMoney()

sumMoney()

```



Jangan hard-code:



```text

"Rp" + amount

```



di component.



\---



\# 29. Database Schema — Categories



```text

categories

────────────────────────

id

name

type

icon\_key

system\_key

is\_default

is\_fallback

sort\_order

created\_at

updated\_at

```



Type:



```text

expense

income

```



Category name unique dalam type secara case-insensitive.



\---



\# 30. Default Expense Categories



```text

Food \& Drink

Transportation

Shopping

Bills

Entertainment

Health

Education

Subscription

Work

Travel

Other

```



\---



\# 31. Default Income Categories



```text

Salary

Freelance

Business

Allowance

Refund

Gift

Other

```



\---



\# 32. System Keys



Jangan bergantung pada ID atau display name.



Gunakan stable:



```text

expense\_food

expense\_transportation

expense\_other



income\_salary

income\_other

```



\---



\# 33. Database Schema — Payment Methods



```text

payment\_methods

────────────────────────

id

name

system\_key

is\_default

is\_fallback

sort\_order

created\_at

updated\_at

```



Default:



```text

Cash

Bank Transfer

Debit Card

Credit Card

GoPay

OVO

DANA

ShopeePay

Other

```



\---



\# 34. Payment Method Rule



Payment Method adalah metadata.



Tidak memiliki:



\- balance;

\- account number;

\- opening balance;

\- bank sync.



\---



\# 35. Database Schema — Transactions



```text

transactions

────────────────────────────

id

type

amount\_minor

currency\_code

category\_id

payment\_method\_id

counterparty

note

occurred\_at

timezone\_offset\_minutes

local\_date

is\_reimbursable

created\_at

updated\_at

```



\---



\# 36. Transaction Required Fields



Expense:



```text

type

amount\_minor

currency\_code

category\_id

occurred\_at

timezone\_offset\_minutes

local\_date

```



Income sama.



Optional:



```text

payment\_method\_id

counterparty

note

```



\---



\# 37. Transaction Types



Allowed:



```text

expense

income

```



Income:



```text

is\_reimbursable = false

```



Income:



\- tidak punya Receipt;

\- tidak dapat masuk Claim.



\---



\# 38. Database Schema — Receipts



```text

receipts

────────────────────────

id

transaction\_id

storage\_key

mime\_type

ocr\_status

ocr\_raw\_text

subtotal\_minor

tax\_minor

created\_at

updated\_at

```



Maximum:



```text

1 Receipt per Transaction

```



Receipt hanya untuk Expense.



\---



\# 39. OCR Status



Allowed:



```text

not\_processed

processed

partial

failed

```



Meaning:



```text

not\_processed

→ attached manually without OCR



processed

→ OCR text + useful parsed total



partial

→ OCR text found, parsing incomplete



failed

→ OCR exception / no readable text

```



\---



\# 40. Receipt Source of Truth



Final approved:



```text

merchant

date

total

```



berada di Transaction.



Receipt menyimpan:



```text

raw OCR

subtotal

tax

image

```



Jangan menyimpan duplicate final total sebagai OCR candidate field.



\---



\# 41. Receipt Storage



Persistent directory:



```text

document/

└── receipts/

```



Database menyimpan relative key:



```text

receipts/receipt\_xxx.jpg

```



Bukan:



```text

content://...

absolute filesystem path

base64

BLOB

```



\---



\# 42. Database Schema — Claims



```text

claims

────────────────────────

id

title

description

status

period\_mode

period\_start

period\_end

submitted\_at

reimbursed\_at

rejected\_at

created\_at

updated\_at

```



\---



\# 43. Claim Status



Allowed:



```text

draft

submitted

reimbursed

rejected

```



Transitions:



```text

draft → submitted



submitted → draft

submitted → reimbursed

submitted → rejected



rejected → draft

```



Reimbursed terminal.



\---



\# 44. Claim Period



Default:



```text

period\_mode = auto

```



Auto:



```text

MIN(transaction.local\_date)

MAX(transaction.local\_date)

```



Manual allowed.



\---



\# 45. Claim Total



Tidak disimpan.



Selalu:



```text

SUM(transaction.amount\_minor)

```



\---



\# 46. Database Schema — Claim Items



```text

claim\_items

────────────────────────

id

claim\_id

transaction\_id

created\_at

```



`transaction\_id` UNIQUE.



Artinya:



> satu Transaction maksimal berada di satu Claim pada satu waktu.



\---



\# 47. Eligible Claim Transaction



Harus:



```text

type = expense

is\_reimbursable = true

not already in claim\_items

```



Receipt tidak wajib.



\---



\# 48. Claim Currency Rule



First selected Transaction menentukan currency Claim secara derived.



Semua Transaction berikutnya harus punya currency yang sama.



Jika berbeda:



```text

This expense uses a different currency.

```



\---



\# 49. Settings



`app\_settings`:



```text

key

value

updated\_at

```



MVP minimal:



```text

welcome\_seen

default\_currency\_code

```



Default:



```text

default\_currency\_code = IDR

```



\---



\# 50. Foreign Key Behavior



```text

Category → Transaction

ON DELETE RESTRICT



Payment Method → Transaction

ON DELETE RESTRICT



Transaction → Receipt

ON DELETE CASCADE



Claim → Claim Item

ON DELETE CASCADE



Transaction → Claim Item

ON DELETE RESTRICT

```



\---



\# 51. Category Delete Rule



Jika custom category dipakai:



```text

BEGIN

↓

reassign transactions → fallback Other

↓

delete category

↓

COMMIT

```



Fallback category tidak dapat dihapus.



\---



\# 52. Payment Method Delete Rule



Jika custom method digunakan:



```text

reassign transactions → Other

delete custom method

```



dalam satu DB transaction.



Default methods tidak dihapus pada MVP.



\---



\# 53. Database Transaction Strategy



Multi-step write gunakan:



```text

withExclusiveTransactionAsync

```



jika tersedia.



Contoh:



\- create Claim + items;

\- reassign category + delete;

\- update Claim membership.



\---



\# 54. Receipt Save Atomicity



Filesystem + SQLite tidak benar-benar satu transaction.



Gunakan compensation:



```text

Validate

↓

copy receipt file

↓

BEGIN DB

↓

insert transaction

↓

insert receipt

↓

COMMIT

```



Jika DB gagal:



```text

ROLLBACK

↓

delete copied file

```



\---



\# 55. Receipt Replacement



```text

copy new image

↓

DB update

↓

commit

↓

delete old image

```



Jika DB gagal:



```text

delete new image

keep old

```



\---



\# 56. Database Indexes



Minimal:



```sql

idx\_transactions\_local\_date



idx\_transactions\_type\_date



idx\_transactions\_category\_date



idx\_transactions\_payment\_date



idx\_transactions\_reimbursable\_date



idx\_claims\_status\_updated



idx\_claim\_items\_claim

```



Jangan index setiap column tanpa alasan.



\---



\# 57. Search



Search terhadap:



```text

counterparty

note

category name

```



Gunakan SQLite case-insensitive `LIKE`.



Tidak perlu:



\- FTS;

\- fuzzy search;

\- external search engine.



\---



\# 58. Pagination



Transaction list:



```text

page size ≈ 50

```



Gunakan:



```sql

ORDER BY occurred\_at DESC, id DESC

LIMIT ? OFFSET ?

```



\---



\# 59. Home Data



Home menggunakan targeted SQL aggregation.



Jangan fetch semua transaksi ke JS.



Queries:



```text

monthly Expense

monthly Income

Net

spending by category

5 recent transactions

```



\---



\# 60. Transaction Typescript Model



Example service input:



```ts

type CreateTransactionInput = {

&#x20; type: "expense" | "income";



&#x20; amountMinor: number;

&#x20; currencyCode: string;



&#x20; categoryId: number;

&#x20; paymentMethodId: number | null;



&#x20; counterparty: string | null;

&#x20; note: string | null;



&#x20; occurredAt: number;

&#x20; timezoneOffsetMinutes: number;

&#x20; localDate: string;



&#x20; isReimbursable: boolean;

};

```



\---



\# 61. Receipt Service Input



```ts

type SaveReceiptInput = {

&#x20; sourceImageUri: string;

&#x20; mimeType: string;



&#x20; ocrStatus:

&#x20;   | "not\_processed"

&#x20;   | "processed"

&#x20;   | "partial"

&#x20;   | "failed";



&#x20; ocrRawText: string | null;



&#x20; subtotalMinor: number | null;

&#x20; taxMinor: number | null;

};

```



\---



\# 62. OCR Architecture



Pipeline:



```text

Camera

&#x20;  │

&#x20;  └─────┐

&#x20;        ▼

&#x20;     Image URI

&#x20;        ▲

&#x20;  ┌─────┘

Gallery

&#x20;        ↓

Image Validation

&#x20;        ↓

OCR

&#x20;        ↓

Raw OCR Text

&#x20;        ↓

Receipt Parser

&#x20;        ↓

Structured Candidate

&#x20;        ↓

Review Screen

&#x20;        ↓

Save

```



Camera dan Gallery \*\*harus menggunakan pipeline yang sama\*\*.



\---



\# 63. OCR Engine



Gunakan:



```text

Google ML Kit Text Recognition

```



On-device.



Tidak ada upload ke server.



Tidak ada cloud OCR.



\---



\# 64. OCR Boundary



Screen tidak memanggil native OCR package secara langsung.



Gunakan:



```text

ocr-service.ts

```



Concept:



```ts

async function recognizeReceipt(

&#x20; imageUri: string

): Promise<OcrResult>

```



\---



\# 65. Receipt Parser



Gunakan:



```text

receipt-parser.ts

```



Harus pure TypeScript.



Tidak boleh import:



\- React;

\- Expo;

\- SQLite;

\- Camera;

\- native ML Kit.



\---



\# 66. Parsed Receipt



```ts

type ParsedReceipt = {

&#x20; merchant: string | null;

&#x20; localDate: string | null;



&#x20; totalMinor: number | null;

&#x20; subtotalMinor: number | null;

&#x20; taxMinor: number | null;



&#x20; warnings: ReceiptParseWarning\[];

};

```



\---



\# 67. OCR Parser Scope



MVP mencoba mendeteksi:



```text

Merchant

Date

Total

Subtotal

Tax

```



Tidak wajib:



```text

individual receipt items

product quantities

unit prices

automatic category

```



\---



\# 68. OCR Parser Strategy



Gunakan deterministic heuristics:



\- normalization;

\- regex;

\- keyword ranking;

\- line position;

\- numeric normalization.



Tidak menggunakan:



\- LLM;

\- random scoring;

\- network request.



\---



\# 69. OCR Total Keywords



Consider:



```text

TOTAL

GRAND TOTAL

TOTAL PAYMENT

TOTAL BAYAR

JUMLAH

AMOUNT

```



Prioritize:



```text

Grand Total

```



over:



```text

Subtotal

```



Avoid selecting:



```text

Cash

Change

Tender

```



as transaction total.



\---



\# 70. OCR Date Formats



Support common:



```text

14/08/2026

14-08-2026

14.08.2026

2026-08-14

14 Aug 2026

```



\---



\# 71. OCR Tax Keywords



```text

TAX

PPN

VAT

PB1

SERVICE TAX

```



Missing tax:



```text

null

```



bukan:



```text

0

```



\---



\# 72. OCR Mandatory Review



OCR tidak pernah langsung Save.



Always:



```text

OCR

↓

Review

↓

User confirms/corrects

↓

Save

```



\---



\# 73. OCR Failure Philosophy



Golden rule:



> \*\*OCR failure must degrade gracefully into manual entry.\*\*



Perfect:



```text

OCR → fast transaction

```



Partial:



```text

OCR → user edits missing fields

```



Failed:



```text

Manual Transaction + receipt attached

```



Tidak ada dead end.



\---



\# 74. OCR Complete Failure



Show:



```text

We couldn't read this receipt.



Try another image or enter the expense manually.



\[ Try Another Image ]

\[ Enter Manually ]

```



Jika manual:



receipt tetap attached.



\---



\# 75. OCR Partial Failure



Jika raw text ada tetapi parsing tidak lengkap:



```text

Some receipt details couldn't be detected.

Please review the fields below.

```



Field detected tetap terisi.



Missing field kosong/default sesuai rule.



\---



\# 76. OCR Missing Total



Total wajib.



Save tidak dapat dilakukan sampai valid amount diberikan.



```text

Enter the receipt total.

```



\---



\# 77. OCR Missing Merchant



Merchant optional.



Save tetap allowed.



\---



\# 78. OCR Missing Date



Gunakan current local datetime sebagai working value.



Show:



```text

Receipt date wasn't detected. Please check it.

```



\---



\# 79. OCR Timeout



Threshold:



```text

≈ 20 seconds

```



Show:



```text

Receipt processing is taking longer than expected.



\[ Try Again ]

\[ Enter Manually ]

```



Tidak perlu fake progress.



\---



\# 80. Camera Scope



Camera controls:



```text

Close

Flash

Capture

Gallery shortcut

```



Tidak implement:



\- live OCR;

\- zoom slider;

\- document edge detection;

\- frame processing;

\- video;

\- filters.



\---



\# 81. Camera Permission



Ask only ketika user memilih Scan Receipt.



Denied:



```text

Camera access is disabled.



Enable it in Android Settings

or import a receipt instead.



\[ Open Settings ]

\[ Import Receipt ]

```



\---



\# 82. Gallery Scope



Single image only.



Supported:



```text

JPEG

PNG

WEBP

```



Cancel picker bukan error.



\---



\# 83. Manual Receipt Attachment



Jika user memilih Manual Transaction lalu attach receipt:



```text

ocr\_status = not\_processed

```



Jangan otomatis OCR.



\---



\# 84. File Storage Layout



```text

document/

└── receipts/



cache/

└── exports/

```



Persistent Receipt → document.



Generated PDF → cache.



\---



\# 85. PDF Architecture



Pipeline:



```text

Claim ID

↓

query Claim

↓

build ClaimPdfModel

↓

render HTML

↓

embed receipt as base64

↓

expo-print

↓

PDF

↓

expo-sharing

```



\---



\# 86. PDF Content



Minimum:



```text

EXPENSE CLAIM



Title

Period

Generated date



Expense table:

Date

Description

Category

Amount



Total



Receipt Attachments

```



\---



\# 87. Missing Receipt in PDF



Expense tetap muncul.



Attachment section:



```text

Receipt not attached

```



Tidak menghilangkan expense.



\---



\# 88. PDF File Name



Format:



```text

expense-claim-<slug-title>-<date>.pdf

```



Contoh:



```text

expense-claim-client-meeting-bandung-2026-08-14.pdf

```



\---



\# 89. PDF HTML Safety



Escape:



```text

claim title

description

merchant

note

category

```



before injecting into HTML.



\---



\# 90. Generated PDF Persistence



PDF bukan domain data.



Tidak ada table:



```text

generated\_pdfs

```



Regenerate on demand.



\---



\# 91. Main Screens



Screen map:



```text

BOOT

S01 Bootstrap

S02 Welcome



MAIN

S03 Home

S13 Transactions

S18 Claims

S27 Settings



TRANSACTION

S04 Add Transaction Sheet

S05 Manual Transaction

S06 Category Picker

S07 Payment Method Picker

S15 Transaction Detail

S16 Edit Transaction

S17 Receipt Viewer



OCR

S08 Camera

S09 Capture Preview

S10 OCR Processing

S11 Receipt Review

S12 OCR Failure



CLAIM

S19 New Claim Details

S20 Select Expenses

S21 Claim Review

S22 Draft Claim Detail

S23 Submitted Claim Detail

S24 Reimbursed Claim Detail

S25 Rejected Claim Detail

S26 PDF Generation



SETTINGS

S28 Categories

S29 Add/Edit Category

S30 Payment Methods

S31 Add/Edit Payment Method

S32 Delete All Data

```



\---



\# 92. Home Screen



Show:



```text

Current month



Expenses this month

Income

Net



Spending by category



Recent transactions

```



No user avatar.



No greeting requirement.



No giant dashboard hero.



\---



\# 93. Home Category Visualization



Gunakan simple horizontal bars.



Tidak menggunakan chart library.



Show top 4–5 categories.



Always show monetary amount as text.



\---



\# 94. Recent Transactions



Show max:



```text

5

```



Row:



```text

\[icon] Merchant/Source              Amount

&#x20;      Category · Date

```



Fallback label:



```text

Merchant

→ Category

→ Expense

```



\---



\# 95. Add Transaction Sheet



Options:



```text

Enter Manually

Scan Receipt

Import Receipt

```



Order tidak berubah.



\---



\# 96. Manual Transaction Form



Default:



```text

Expense

```



Segment:



```text

\[ Expense ] \[ Income ]

```



Field order:



```text

Amount \*

Category \*

Date \& Time \*

Merchant / Source

Payment Method

Reimbursable — Expense only

Note

Receipt — Expense only

```



\---



\# 97. Amount Field



Auto-focus.



Must:



```text

> 0

safe integer minor amount

```



Inline error:



```text

Enter an amount.

```



\---



\# 98. Category



Required.



Expense hanya Expense category.



Income hanya Income category.



\---



\# 99. Date



Default current local datetime.



Future transaction date:



```text

not allowed

```



Validation:



```text

Transaction date cannot be in the future.

```



\---



\# 100. Counterparty



Expense label:



```text

Merchant

```



Income label:



```text

Source

```



Optional.



Trim whitespace.



Empty string → null.



\---



\# 101. Note



Optional.



Max:



```text

500 characters

```



\---



\# 102. Reimbursable



Expense only.



Default:



```text

false

```



\---



\# 103. Manual Save



Button:



```text

Save Expense

Save Income

```



On submit:



1\. validate;

2\. disable button;

3\. save;

4\. return;

5\. lightweight feedback.



```text

Expense saved.

```



No success modal.



\---



\# 104. Unsaved Changes



Back dengan changes:



```text

Discard changes?



Your unsaved changes will be lost.



\[ Keep Editing ]

\[ Discard ]

```



\---



\# 105. Receipt Review Screen



Hierarchy:



```text

Receipt thumbnail



Total \*

Merchant

Date \*

Category \*

Subtotal

Tax

Payment Method

Reimbursable

Note



Save Expense

```



Receipt Review mandatory.



\---



\# 106. Transactions Screen



Header:



```text

Transactions

```



Controls:



```text

Search

Filters

```



List:



```text

grouped chronologically

```



Use FlatList.



\---



\# 107. Transaction Search



Search:



```text

merchant/source

note

category

```



Debounce:



```text

\~250–300 ms

```



\---



\# 108. Transaction Filters



MVP:



```text

Type

Category

Date Range

Payment Method

Reimbursable

Has Receipt

```



Filter action:



```text

Reset

Apply Filters

```



\---



\# 109. Transaction Detail



Show:



```text

Merchant / Source

Amount

Category

Date \& Time

Payment Method

Note

Receipt

Reimbursement status

```



Actions:



```text

Edit

Delete

```



\---



\# 110. Delete Transaction



If not Claim:



```text

Delete transaction?



This action cannot be undone.



\[ Cancel ]

\[ Delete ]

```



If Draft Claim:



```text

deletion removes Claim membership then Transaction

```



after explicit warning.



If Submitted/Reimbursed Claim:



```text

blocked

```



\---



\# 111. Transaction Editing \& Claim Lock



Draft Claim:



transaction editable.



If amount/date changes:



```text

Claim total / auto period recalculated

```



Submitted:



important reimbursement fields locked.



Must move Claim back to Draft first.



Reimbursed:



read-only.



\---



\# 112. Category Management



Allow:



```text

Add custom category

Edit custom category

Delete custom category

```



Default category naming does not need to be editable.



Custom name max:



```text

40 characters

```



Duplicate case-insensitive prohibited.



\---



\# 113. Payment Method Management



Allow:



```text

Add custom

Rename custom

Delete custom

```



Max:



```text

40 characters

```



No account balance.



\---



\# 114. Claims Screen



Filters/status:



```text

All

Draft

Submitted

Reimbursed

Rejected

```



CTA:



```text

New Claim

```



\---



\# 115. New Claim — Step 1



Fields:



```text

Title \*

Description

Period

```



Title max:



```text

100

```



Description max:



```text

500

```



Default period:



```text

Based on expense dates

```



\---



\# 116. New Claim — Step 2



Select only:



```text

reimbursable Expense

not already in Claim

```



Show:



```text

Merchant

Category

Date

Amount

Receipt attached/missing

```



Receipt missing does not block.



\---



\# 117. New Claim — Step 3



Review:



```text

Title

Period



Expense rows



Total



Receipt attached count

Receipt missing count



Save Draft

```



\---



\# 118. Draft Claim



Allowed:



```text

Edit Claim

Add/remove Expense

Export PDF

Mark Submitted

Delete Claim

```



\---



\# 119. Submitted Claim



Locked.



Allowed:



```text

Export PDF

Mark Reimbursed

Mark Rejected

Move Back to Draft

```



\---



\# 120. Reimbursed Claim



Read-only.



Allowed:



```text

Export PDF

Share PDF

```



No Edit/Delete.



\---



\# 121. Rejected Claim



Allowed:



```text

Export PDF

Move Back to Draft

```



\---



\# 122. Claim Delete



Only Draft Claim.



Deleting Claim:



```text

claim\_items deleted

transactions remain

```



\---



\# 123. Settings Screen



Show:



```text

Categories

Payment Methods



Currency

Indonesian Rupiah (IDR)



Delete All Data



About

```



Currency read-only pada MVP.



\---



\# 124. Delete All Data



Two-step confirmation.



Deletes:



```text

transactions

receipts

claims

claim\_items

custom categories

custom payment methods

receipt files

cached export files

settings as appropriate

```



Then re-seed defaults.



\---



\# 125. Offline Requirement



Dengan network emulator disabled, berikut harus tetap berfungsi:



```text

Manual Transaction

Transactions

Search

Filters

Home Summary

Gallery Receipt

OCR

Receipt Review

Claims

PDF

Sharing local file

Settings

```



\---



\# 126. Privacy Requirements



MVP:



```text

No login

No backend

No cloud

No telemetry

No receipt upload

No bank API

OCR on-device

```



Tidak install analytics/monitoring SDK.



\---



\# 127. Encryption Scope



Tidak implement custom encryption pada MVP.



Rely pada:



```text

Android application sandbox

device security

```



Do not invent homemade encryption.



\---



\# 128. UI Visual Baseline



MVP:



```text

Light theme only

Clean

Calm

Utilitarian

Content-first

```



Primary accent:



```text

\#2563EB

```



Visual baseline \*\*bukan permanent product branding contract\*\*.



UI dapat di-redesign di masa depan selama Product/Behavior/Data contract tetap dihormati.



\---



\# 129. Visual Tokens



Baseline:



```text

Background

\#F8FAFC



Surface

\#FFFFFF



Surface Secondary

\#F1F5F9



Text Primary

\#0F172A



Text Secondary

\#64748B



Border

\#E2E8F0



Primary

\#2563EB

```



Semantic:



```text

Positive

\#15803D



Destructive

\#B42318



Warning

\#B54708

```



\---



\# 130. Typography



Gunakan system font.



No custom font.



Typical:



```text

Display amount       28–32

Page title            24

Section title         18

Body                  16

Secondary             14

Metadata              12–13

```



\---



\# 131. UI Component Rules



Allowed reusable primitives:



```text

AppButton

AppInput

AmountInput

FieldError

EmptyState

ConfirmationDialog

Screen

```



Jangan membuat abstraction untuk setiap View/Text.



\---



\# 132. Card Rule



Tidak semua elemen berada di card.



Prefer:



```text

spacing

typography

divider

surface separation

```



Cards hanya jika secara visual membantu grouping.



\---



\# 133. Accessibility



Minimum:



\- touch target ≥ 48dp;

\- icon buttons punya accessible label;

\- status tidak hanya dengan warna;

\- Expense/Income dibedakan dengan `+/-`;

\- font scaling reasonable;

\- important CTA tetap accessible.



\---



\# 134. Error Philosophy



Error menjelaskan:



```text

what happened

\+

what user can do

```



Jangan expose:



```text

SQLiteException

ML Kit codes

Java exception

```



\---



\# 135. Error Model



Simple application codes:



```text

VALIDATION\_FAILED

DATABASE\_WRITE\_FAILED

OCR\_FAILED

OCR\_TIMEOUT

FILE\_OPERATION\_FAILED

CLAIM\_LOCKED

CLAIM\_CURRENCY\_MISMATCH

PDF\_GENERATION\_FAILED

```



Tidak perlu exception hierarchy kompleks.



\---



\# 136. Loading Philosophy



Loading only for real work:



```text

Database bootstrap

OCR

PDF

Camera startup jika noticeable

```



Tidak ada artificial loading.



Tidak ada fake progress percentage.



\---



\# 137. Success Feedback



Use lightweight message:



```text

Expense saved.

Category added.

Receipt removed.

```



No modal.



\---



\# 138. Code Style



TypeScript strict.



Prefer:



```text

function

plain object

literal union

```



over unnecessary classes.



No `any` unless unavoidable third-party integration, and justification required.



\---



\# 139. Domain Types



Prefer:



```ts

type TransactionType = "expense" | "income";



type ClaimStatus =

&#x20; | "draft"

&#x20; | "submitted"

&#x20; | "reimbursed"

&#x20; | "rejected";

```



Jangan boolean explosion seperti:



```text

isDraft

isSubmitted

isRejected

isReimbursed

```



\---



\# 140. SQL Rules



Always parameterize user input.



Correct:



```sql

WHERE counterparty LIKE ?

```



Wrong:



```ts

`... LIKE '%${search}%'`

```



\---



\# 141. Service Boundary



Business rules harus hidup di services.



Examples:



```text

transaction-service.ts

claim-service.ts

category-service.ts

payment-method-service.ts

receipt-service.ts

```



Screen tidak boleh mengimplement Claim transitions sendiri.



\---



\# 142. Claim Service API



Expected conceptual functions:



```text

createDraftClaim()

updateDraftClaim()

addExpenseToClaim()

removeExpenseFromClaim()

submitClaim()

markClaimReimbursed()

rejectClaim()

moveClaimToDraft()

deleteDraftClaim()

```



\---



\# 143. Receipt Service API



Expected conceptual functions:



```text

createExpenseWithReceipt()

replaceReceipt()

removeReceipt()

persistReceiptImage()

```



\---



\# 144. Transaction Query API



Expected conceptual functions:



```text

getTransactionById()

listTransactions()

insertTransaction()

updateTransaction()

deleteTransaction()



getMonthlySummary()

getSpendingByCategory()

getRecentTransactions()

```



Jangan generic CRUD repository.



\---



\# 145. Derived Read Models



UI-specific query projection allowed.



Examples:



```text

TransactionListItem

ClaimDetail

HomeSummary

```



Tidak perlu disimpan ke DB.



\---



\# 146. No N+1 Queries



Transaction list harus JOIN data yang relevan.



Jangan:



```text

50 rows

→ 50 category queries

→ 50 receipt queries

```



\---



\# 147. Implementation Order — Final



\## Phase 0 — Project Bootstrap



Implement:



```text

Expo project

TypeScript strict

Expo Router

Development Build

ESLint

Prettier

Jest baseline

Theme tokens

Root layout

```



\---



\# 148. Milestone 0 Acceptance Criteria



Must:



\- app builds Android;

\- launches in Pixel 7 emulator;

\- TypeScript strict enabled;

\- Expo Router works;

\- dev-client launches;

\- lint works;

\- test command works;

\- no application business features yet required.



\---



\# 149. Phase 1 — Database Foundation



Implement:



```text

expo-sqlite

database provider

PRAGMA setup

migration system

001\_initial migration

seed defaults

app\_settings

```



Use final currency-aware schema from day one.



\---



\# 150. Milestone 1 Acceptance Criteria



Must prove:



\- database initializes;

\- migration runs once;

\- app restart does not duplicate seed;

\- categories seeded;

\- payment methods seeded;

\- default\_currency\_code = IDR;

\- foreign keys active;

\- WAL active;

\- application survives restart.



\---



\# 151. Phase 2 — Core Utilities



Implement:



```text

money utilities

currency fraction handling

date utilities

string normalization

error mapping

HTML escaping

```



\---



\# 152. Milestone 2 Acceptance Criteria



Tests must cover:



```text

IDR parsing

USD parsing

JPY parsing

money formatting

safe integer checks

date local-date generation

HTML escaping

```



No UI currency selector required.



\---



\# 153. Phase 3 — Categories \& Payment Methods



Implement:



```text

list

add

custom edit

custom delete

fallback reassignment

pickers

```



\---



\# 154. Milestone 3 Acceptance Criteria



Must prove:



\- custom category can be added;

\- duplicate category rejected;

\- type separation works;

\- fallback Other cannot be deleted;

\- delete used category reassigns Transaction;

\- custom payment method can be managed;

\- default methods remain protected.



\---



\# 155. Phase 4 — Manual Transactions



Implement:



```text

Manual Expense

Manual Income

validation

category selection

payment method

reimbursable

note

manual Receipt attachment

save/edit/delete

```



\---



\# 156. Milestone 4 Acceptance Criteria



Must prove:



\- Expense default;

\- Income switch works;

\- amount required;

\- category required;

\- future date rejected;

\- Income cannot reimbursable;

\- Income cannot attach Receipt;

\- transaction persists after restart;

\- double save prevented;

\- unsaved changes guarded;

\- manual attached Receipt stores `not\_processed`.



\---



\# 157. Phase 5 — Transaction History



Implement:



```text

Transactions screen

pagination

search

filters

Transaction Detail

Edit

Delete

```



\---



\# 158. Milestone 5 Acceptance Criteria



Must prove:



\- newest-first ordering;

\- list handles 100+ transactions;

\- search merchant;

\- search category;

\- filters work;

\- filter empty state correct;

\- transaction delete works;

\- read models do not produce N+1 behavior;

\- screen refetches after Add/Edit/Delete.



\---



\# 159. Phase 6 — Home



Implement:



```text

monthly Expense

monthly Income

Net

category breakdown

recent transactions

```



\---



\# 160. Milestone 6 Acceptance Criteria



Must prove:



\- totals match DB data;

\- Expense and Income separated;

\- Net correct;

\- category breakdown correct;

\- recent list correct;

\- empty state correct;

\- no fake/sample production data;

\- no chart library added.



\---



\# 161. Phase 7 — Gallery Receipt Pipeline



Implement gallery first:



```text

Image Picker

image validation

temporary image flow

Receipt flow Context

```



Do not implement OCR UI twice.



\---



\# 162. Milestone 7 Acceptance Criteria



Must prove:



\- image can be selected;

\- cancel picker returns normally;

\- supported image passes;

\- invalid image gives recoverable error;

\- image survives until user exits flow;

\- no DB data is written before final Save.



\---



\# 163. Phase 8 — OCR \& Parser



Implement:



```text

ML Kit bridge

ocr-service

receipt-parser

OCR loading

Receipt Review

partial state

failure state

manual fallback

```



\---



\# 164. Milestone 8 Acceptance Criteria



Using fixture images/raw text:



Must prove:



```text

clear receipt → text found

total recognized where possible

merchant candidate recognized

date recognized where possible

tax/subtotal optional

partial result editable

empty OCR → fallback

native error → fallback

timeout → fallback

```



Receipt Review always shown.



\---



\# 165. Phase 9 — Camera



Implement:



```text

Camera permission

CameraView

Flash

Capture

Preview

Retake

Use Photo

Gallery shortcut

```



Camera output feeds existing OCR pipeline.



\---



\# 166. Milestone 9 Acceptance Criteria



Must prove:



\- permission request only on Scan;

\- denied permission handled;

\- emulator camera opens;

\- capture works;

\- Retake works;

\- Use Photo enters same OCR service;

\- Camera and Gallery do not have duplicate parser logic.



\---



\# 167. Phase 10 — Persistent Receipts



Implement:



```text

document storage

relative storage key

save compensation

replace

remove

viewer

```



\---



\# 168. Milestone 10 Acceptance Criteria



Must prove:



\- Receipt survives app restart;

\- gallery temporary URI not persisted as source of truth;

\- Receipt row linked to Transaction;

\- deleting Transaction removes Receipt row;

\- filesystem cleanup occurs;

\- DB failure after file copy cleans new file;

\- replace Receipt does not lose old image if DB update fails.



\---



\# 169. Phase 11 — Claims



Implement:



```text

New Claim

select eligible Expenses

same-currency validation

Claim Review

Draft

Submitted

Rejected

Reimbursed

locks

membership changes

```



\---



\# 170. Milestone 11 Acceptance Criteria



Must prove:



```text

non-reimbursable not selectable

Income not selectable

Transaction cannot enter 2 Claims

IDR + IDR allowed

USD + USD allowed

IDR + USD rejected

receipt missing allowed

Claim total accurate

Draft editable

Submitted locked

Rejected can return Draft

Reimbursed terminal

```



\---



\# 171. Phase 12 — PDF \& Sharing



Implement:



```text

ClaimPdfModel

HTML rendering

HTML escaping

Receipt base64 embed

expo-print

expo-sharing

```



\---



\# 172. Milestone 12 Acceptance Criteria



Must prove:



\- PDF generated offline;

\- title correct;

\- period correct;

\- expense table correct;

\- total correct;

\- currency formatting correct;

\- Receipt attached appears;

\- missing Receipt represented;

\- HTML special chars safe;

\- generated filename valid;

\- share sheet opens.



\---



\# 173. Phase 13 — Settings \& Data Reset



Implement:



```text

Settings

Categories page

Payment Methods page

Currency display

Delete All Data

About

```



\---



\# 174. Milestone 13 Acceptance Criteria



Must prove:



\- currency shown as IDR read-only;

\- Delete All Data requires deliberate confirmation;

\- all Transaction data removed;

\- Receipt files removed;

\- Claims removed;

\- defaults re-seeded;

\- app returns to valid empty state.



\---



\# 175. Phase 14 — Edge Cases \& Polish



Test:



\- app restart;

\- OCR interrupted;

\- rapid double taps;

\- Transaction locked by Claim;

\- remove Receipt;

\- long merchant text;

\- large amounts;

\- empty history;

\- many Transactions;

\- Android Back;

\- keyboard;

\- font scaling;

\- network disabled.



\---



\# 176. Milestone 14 Acceptance Criteria



All critical flows must complete without:



\- crash;

\- dead end;

\- data corruption;

\- silent data loss;

\- duplicate save.



\---



\# 177. Critical User Flow A — Quick Expense



```text

Home

↓

\+

↓

Enter Manually

↓

5000

↓

Transportation

↓

Save

```



Expected:



```text

Expense stored

Home updated

Transactions updated

```



\---



\# 178. Critical User Flow B — Gallery OCR



```text

\+

↓

Import Receipt

↓

Gallery

↓

Image

↓

OCR

↓

Review

↓

Category

↓

Save Expense

```



\---



\# 179. Critical User Flow C — Camera OCR



```text

\+

↓

Scan Receipt

↓

Camera

↓

Capture

↓

Use Photo

↓

OCR

↓

Review

↓

Save

```



\---



\# 180. Critical User Flow D — OCR Failure



```text

Receipt

↓

OCR fails

↓

Enter Manually

↓

Manual Expense

Receipt attached

↓

Save

```



\---



\# 181. Critical User Flow E — Claim



```text

Claims

↓

New Claim

↓

Title

↓

Select Expenses

↓

Review

↓

Save Draft

↓

Export PDF

↓

Mark Submitted

↓

Mark Reimbursed

```



\---



\# 182. Critical User Flow F — Submitted Correction



```text

Submitted Claim

↓

Move Back to Draft

↓

Edit

↓

Review

↓

Submit again

```



\---



\# 183. Testing Strategy



Testing dibagi menjadi:



```text

Unit

Component

Database/Integration

Native Manual

End-to-End Manual

```



\---



\# 184. Testing Matrix — Money



| Scenario | Expected |

|---|---|

| IDR 35000 | Rp35.000-like display |

| USD 1250 | $12.50-like display |

| JPY 1500 | ¥1,500-like display |

| 0 amount | rejected |

| negative | rejected |

| unsafe integer | rejected |

| invalid input | validation error |



\---



\# 185. Testing Matrix — Transactions



| Scenario | Expected |

|---|---|

| Valid Expense | saved |

| Valid Income | saved |

| No amount | blocked |

| No category | blocked |

| Future date | blocked |

| Income reimbursable | blocked/reset |

| Income Receipt | blocked |

| Double Save | one record only |

| Restart | record remains |



\---



\# 186. Testing Matrix — Categories



| Scenario | Expected |

|---|---|

| Add custom | success |

| Duplicate case | rejected |

| Delete unused | deleted |

| Delete used | reassigned to Other |

| Delete Other | blocked |

| Expense category on Income | blocked |



\---



\# 187. Testing Matrix — OCR



| Scenario | Expected |

|---|---|

| Clear receipt | parsed candidates |

| Missing merchant | Save still possible |

| Missing date | default + warning |

| Missing total | user must enter |

| Empty OCR | failure fallback |

| OCR exception | recoverable |

| Timeout | retry/manual |

| Same image repeatedly | deterministic parser |



\---



\# 188. Testing Matrix — Receipt Files



| Scenario | Expected |

|---|---|

| Save Receipt | survives restart |

| Gallery URI removed externally | app copy still works |

| Replace success | new shown |

| Replace DB failure | old remains |

| Delete Transaction | DB Receipt removed |

| File delete failure | DB remains consistent |



\---



\# 189. Testing Matrix — Claims



| Scenario | Expected |

|---|---|

| Reimbursable Expense | selectable |

| Non-reimbursable | hidden/rejected |

| Income | not selectable |

| Transaction already in Claim | not selectable |

| IDR + IDR | allowed |

| IDR + USD | rejected |

| Missing Receipt | allowed |

| Draft membership edit | allowed |

| Submitted edit | blocked |

| Reimbursed edit | blocked |



\---



\# 190. Testing Matrix — Claim Status



| Current | Next | Expected |

|---|---|---|

| Draft | Submitted | allowed |

| Draft | Reimbursed | blocked |

| Draft | Rejected | blocked |

| Submitted | Draft | allowed |

| Submitted | Reimbursed | allowed |

| Submitted | Rejected | allowed |

| Rejected | Draft | allowed |

| Reimbursed | Draft | blocked |



\---



\# 191. Testing Matrix — PDF



| Scenario | Expected |

|---|---|

| Normal Claim | PDF generated |

| Missing Receipt | shown as missing |

| Multiple Receipts | attached |

| Special chars | escaped |

| Long merchant | layout remains valid |

| Offline | works |

| Share | native sheet opens |

| Generate failure | Claim unchanged |



\---



\# 192. Testing Matrix — Navigation



Test:



```text

Back

Discard form

Cancel gallery

Cancel OCR

Return from detail

Return from edit

Return from Claim

Android system Back

```



No unexpected state loss.



\---



\# 193. Testing Matrix — Offline



Disable emulator network.



Verify:



```text

Add Transaction

Edit

Delete

Home

Search

Filter

OCR

Claims

PDF

Settings

```



still works.



\---



\# 194. Testing Matrix — Accessibility



Test at least:



```text

100% font scale

130%

150%

```



Verify:



\- major CTA visible;

\- amount readable;

\- status readable;

\- button touch targets;

\- icon labels.



\---



\# 195. Unit Test Priorities



Highest:



```text

money parsing

currency formatting

date helpers

receipt parser

Claim transition

same-currency validation

category/business validation

```



\---



\# 196. OCR Test Fixtures



Maintain:



```text

tests/fixtures/receipts/

```



Example:



```text

indomaret-01.txt

alfamart-01.txt

restaurant-01.txt

parking-01.txt

malformed-01.txt

```



\---



\# 197. Image Fixtures



For emulator testing:



```text

tests/fixtures/receipt-images/

```



Example:



```text

clear-retail.jpg

restaurant.jpg

parking.jpg

blurred.jpg

rotated.jpg

low-light.jpg

not-a-receipt.jpg

```



Do not bundle into production build unless needed.



\---



\# 198. Quality Gates



Before Agent declares task complete:



```bash

npm run lint

npm run typecheck

npm test

```



must pass.



If native dependency/config changed:



```bash

npx expo-doctor@latest

npx expo run:android

```



must also pass or issue must be explicitly documented.



\---



\# 199. Recommended Scripts



```json

{

&#x20; "scripts": {

&#x20;   "start": "expo start --dev-client",

&#x20;   "android": "expo run:android",

&#x20;   "lint": "expo lint",

&#x20;   "typecheck": "tsc --noEmit",

&#x20;   "test": "jest",

&#x20;   "test:watch": "jest --watch"

&#x20; }

}

```



\---



\# 200. Definition of Done — Feature



A feature is Done only if:



1\. requirement implemented;

2\. loading state handled;

3\. empty state handled where relevant;

4\. validation implemented;

5\. failure path implemented;

6\. no known crash;

7\. relevant tests added;

8\. lint passes;

9\. typecheck passes;

10\. tests pass;

11\. related screen manually tested on emulator.



\---



\# 201. Definition of Done — Native Feature



Camera/OCR/FileSystem/PDF feature additionally requires:



```text

development build succeeds

feature tested on Pixel 7 emulator

failure path manually tested

```



\---



\# 202. Definition of Done — Milestone



Milestone complete only if:



\- all Acceptance Criteria passed;

\- no placeholder implementation;

\- no fake production data;

\- no unresolved required TODO;

\- no silent error catch;

\- no unused dependency introduced;

\- no dead code intentionally left behind.



\---



\# 203. Definition of Done — MVP



MVP complete when:



\### Core



```text

Manual Expense ✓

Manual Income ✓

Categories ✓

Payment Methods ✓

History ✓

Search ✓

Filters ✓

Home Summary ✓

```



\### Receipt



```text

Gallery ✓

Camera ✓

OCR ✓

Review ✓

Failure fallback ✓

Persistent Receipt ✓

```



\### Claim



```text

Create ✓

Select Expense ✓

Status lifecycle ✓

Currency validation ✓

PDF ✓

Sharing ✓

```



\### Quality



```text

Lint ✓

Typecheck ✓

Tests ✓

Expo Doctor ✓

Android build ✓

Offline test ✓

Restart persistence ✓

```



\---



\# 204. Non-Goals — MVP



Do not implement:



```text

Authentication

Cloud account

Cloud sync

Bank sync

E-wallet API

Automatic account balance

Transfer between accounts

Budgeting

Goals

Recurring transaction engine

Subscription detection

Debt

Loan

Investment

Tax

Invoice system

Multi-user

Collaboration

Company reimbursement submission

Email receipt import

Automatic bank SMS import

Push notifications

AI assistant

Financial recommendations

Chatbot

Automatic category AI

Cloud OCR

Receipt item-level parsing requirement

Exchange rate

Multi-currency Claim

Dark mode

Localization

iOS-specific optimization

Tablet UI

Foldable UI

Complex animations

Gamification

Analytics

Telemetry

```



\---



\# 205. Explicit Future Features That Architecture Should Not Block



Architecture should permit, but \*\*not implement now\*\*:



```text

Currency selection

USD/EUR/JPY etc.

Dark mode

Localization

Cloud backup

Multi-device sync

Receipt item parsing

Multiple Receipt support

Budgeting

Advanced analytics

Account system

```



Do not add placeholder code for them.



Use migrations when future requirement actually arrives.



\---



\# 206. Behavior Contract vs Visual Baseline



Important distinction:



\## Product / Behavior Contract



Relatively stable.



Examples:



```text

OCR must be reviewed

OCR must have fallback

Submitted Claim locks expenses

Reimbursed Claim final

Claim same-currency rule

amount stored as minor unit

```



Agent must not change these.



\## Visual Baseline



Replaceable presentation layer.



Examples:



```text

blue primary accent

exact spacing

exact card arrangement

button shape

Home visual composition

```



These are MVP baseline and may be redesigned later.



Business logic must not be coupled to styling.



\---



\# 207. Anti-Overengineering Rules



Do not create abstraction because:



```text

"we might need this later"

```



Do not create:



```text

BaseRepository<T>

GenericService<T>

GenericController

EventBus

CommandBus

UseCase classes for every button

Feature flags platform

Sync abstraction

Cloud interfaces

Analytics abstraction

```



without real use.



\---



\# 208. Dependency Addition Rule



Before adding dependency, Agent must internally verify:



```text

1\. Requirement apa yang diselesaikan?

2\. Apakah dependency existing tidak cukup?

3\. Apakah solusi internal sederhana lebih buruk?

4\. Apakah dependency native?

5\. Apakah binary perlu rebuild?

```



If weak justification:



> do not add dependency.



\---



\# 209. Anti-Code-Smell Rules



Avoid:



```text

God components

God services

SQL inside React component

OCR parsing inside screen

Business rules inside onPress

Hard-coded category ID

Hard-coded "Rp"

Duplicated Receipt pipeline

Giant constants file

Generic utils dumping ground

Nested ternary UI

Global mutable singleton

Silent catch

Unbounded loading state

Duplicated source of truth

```



\---



\# 210. Function Design



Tidak ada arbitrary 20-line limit.



Tetapi setiap function memiliki satu clear responsibility.



Bad:



```text

captureImageAndRunOCRAndParseAndSaveAndNavigate()

```



Better:



```text

captureReceipt()

recognizeReceipt()

parseReceipt()

saveExpenseWithReceipt()

```



\---



\# 211. Comment Policy



Comments menjelaskan:



\- why;

\- constraint;

\- non-obvious edge case.



Do not comment obvious syntax.



Parser heuristics yang tidak obvious sebaiknya diberi reason.



\---



\# 212. TODO Policy



Required MVP work tidak boleh ditinggalkan sebagai:



```text

TODO: implement later

```



Jika out-of-scope, lebih baik code tidak dibuat.



\---



\# 213. Agent Workflow Rule



Sebelum modifikasi:



1\. inspect existing code;

2\. understand current pattern;

3\. identify minimal files needing change;

4\. implement;

5\. run tests;

6\. run lint/typecheck;

7\. manually verify if native/UI.



\---



\# 214. Agent Must Not



Agent tidak boleh:



\- rewrite entire project unnecessarily;

\- change stack;

\- install random packages;

\- add backend;

\- add auth;

\- add AI;

\- add mock production data silently;

\- replace SQLite with ORM;

\- introduce global state manager;

\- turn OCR into cloud feature;

\- change same-currency Claim behavior;

\- remove mandatory OCR Review;

\- redesign data model without blocker.



\---



\# 215. Agent Must Prefer



```text

small functions

explicit SQL

explicit domain rules

simple React state

clear naming

deterministic parser

recoverable errors

small reusable components

```



\---



\# 216. Naming Convention



TypeScript:



```text

camelCase

```



Components/types:



```text

PascalCase

```



Files:



```text

kebab-case

```



Database:



```text

snake\_case

```



\---



\# 217. Error Catch Rule



Never:



```ts

try {

&#x20; ...

} catch {

}

```



At minimum:



```text

map error

log development detail

show recoverable application state

```



\---



\# 218. Logging Rule



Do not routinely log:



\- full OCR raw text;

\- financial history;

\- receipt base64;

\- Claim PDF;

\- private notes.



Development logging should be minimal.



\---



\# 219. No Network Rule



Core code should not require:



```text

fetch

axios

HTTP client

API client

```



MVP has no backend.



\---



\# 220. No Sample Production Data



First launch production DB:



```text

0 Transactions

0 Claims

```



Only default categories/payment methods/settings seeded.



Any demo fixture must only exist in tests/development.



\---



\# 221. Data Integrity Priority



If filesystem and DB become inconsistent:



> preserve database integrity first.



Orphan file may be cleaned later.



Half-written domain record is worse.



\---



\# 222. Large Data Assumption



Target should comfortably support:



```text

5,000+ Transactions

500+ Receipts

100+ Claims

```



Do not optimize for millions.



\---



\# 223. Performance Basics



Do from beginning:



```text

FlatList

SQL aggregation

pagination

JOIN instead of N+1

minimal base64 lifetime

async database APIs

```



Do not build complex caching infrastructure.



\---



\# 224. UI Copy Rules



Use:



```text

Add Expense

Scan Receipt

Import Receipt

Save Expense

Review Receipt

Export PDF

Receipt missing

```



Avoid:



```text

Unlock your financial potential

Smart finance powered by AI

Take control of your journey

```



\---



\# 225. Destructive Action Rules



Confirmation required for:



```text

Delete Transaction

Delete Claim

Delete Category

Delete Payment Method

Remove Receipt

Discard unsaved changes

Delete All Data

```



Do not confirm normal Save.



\---



\# 226. Claim Lock Rules — Final



\### Draft



Editable.



\### Submitted



Locked.



Can:



```text

Move Back to Draft

Mark Reimbursed

Mark Rejected

```



\### Rejected



Can return Draft.



\### Reimbursed



Read-only terminal state.



\---



\# 227. OCR Rules — Final



```text

Still image only

Camera + Gallery same pipeline

On-device OCR

Review mandatory

Manual fallback mandatory

Item-level OCR not required

No confidence percentage

No auto-save

```



\---



\# 228. Currency Rules — Final



```text

Database currency-aware

MVP UI IDR

amount\_minor integer

currency\_code per Transaction

Receipt inherits Transaction currency

Claim must be single-currency

No conversion

No exchange rate

No hard-coded Rp in domain

```



\---



\# 229. Data Rules — Final



```text

SQLite

INTEGER primary keys

No soft delete

No audit log

No User table

No Account balance table

No cloud columns

No sync fields

No Receipt items table

No OCR confidence table

No generated PDF table

```



\---



\# 230. Visual Rules — Final



```text

Light theme

System font

Minimal shadows

Limited cards

No gradient-heavy design

No AI-slop copy

No custom illustration requirement

No decorative animation

```



\---



\# 231. Product Acceptance — Quick Capture



User should be able to record:



```text

Parking

Rp5.000

Transportation

```



without needing to enter:



```text

Merchant

Payment Method

Note

Receipt

```



\---



\# 232. Product Acceptance — OCR



User should never need to rescan only because OCR failed.



They can:



```text

keep image

enter manually

save

```



\---



\# 233. Product Acceptance — Reimbursement



User never retypes expenses into Claim.



Claim uses existing Transactions.



\---



\# 234. Product Acceptance — Trust



App must never:



\- silently change amount;

\- silently overwrite OCR correction;

\- silently remove Claim item;

\- silently delete Receipt;

\- silently create duplicate Transaction;

\- pretend OCR output is guaranteed correct.



\---



\# 235. Final Architecture Contract



Locked unless explicit approval:



```text

React Native + Expo

TypeScript strict

Android MVP

Expo Development Build



Expo Router



SQLite

No ORM



Local-first

No backend

No auth



React Hook Form

Zod



Google ML Kit OCR

Still-image OCR



Camera + Gallery same pipeline



Receipt filesystem storage



Integer minor-unit money

Currency-aware Transaction

Single-currency Claim



HTML → Expo Print PDF

Expo Sharing



No global state library

No server state library



Feature-oriented folder structure

```



\---



\# 236. Final Definition of MVP Success



MVP is successful when a user can:



```text

Open App

↓

Add Expense

↓

See it in History/Home

↓

Scan or Import Receipt

↓

Review OCR

↓

Save

↓

Mark Expense Reimbursable

↓

Create Claim

↓

Export PDF

```



while:



```text

offline

without login

without backend

without cloud

without data corruption

```



\---



\# 237. Final Instruction to Coding Agent



Implement this product incrementally according to the defined phases.



Do not try to generate the entire application in one giant pass.



For every milestone:



```text

Understand

↓

Implement

↓

Test

↓

Lint

↓

Typecheck

↓

Verify in Emulator

↓

Only then continue

```



When faced with multiple valid implementation choices:



> choose the simplest implementation with the fewest moving parts that still satisfies the specification.



When a feature appears useful but is not part of this specification:



> do not implement it.



When a future-proofing idea requires substantial code but no current requirement:



> do not implement it.



When a fundamental decision in this document creates a verified technical blocker:



> stop, document the blocker, explain the alternatives and trade-offs, and request approval before changing architecture.



The result should be:



> \*\*a small, reliable, readable, maintainable Android MVP — not an over-engineered showcase project.\*\*

