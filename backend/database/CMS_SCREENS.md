# CMS Frontend Screens Specification

## Overview
This document details all screens and user interfaces for the Get2Vacation CMS system.

---

## 1. Authentication & Layout

### 1.1 Login Screen
- Email/password authentication
- "Remember me" option
- Password reset link
- Redirect to dashboard on success

### 1.2 Main Layout
```
┌─────────────────────────────────────────────┐
│ Header: Logo | User Menu | Notifications   │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │        Main Content Area        │
│          │                                  │
│ - Dashboard                                 │
│ - Landing Page                              │
│ - Destinations                              │
│ - Packages                                  │
│ - Visa Services                             │
│ - Media Library                             │
│ - Settings                                  │
│                                             │
└──────────┴──────────────────────────────────┘
```

---

## 2. Dashboard Screen

### 2.1 Overview Cards
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Destinations│  Packages   │    Media    │    Visa     │
│     24      │     156     │     892     │     12      │
│   Active    │  Published  │    Items    │  Services   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 2.2 Recent Activity
- List of recent changes
- User who made change
- Timestamp
- Entity type and action

### 2.3 Quick Actions
- Add New Destination
- Upload Media
- Create Package Mapping
- Add Visa Service

---

## 3. Landing Page Management

### 3.1 Floating Cards Manager

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Landing Page - Floating Cards               │
│ [+ Add New Card]                            │
├─────────────────────────────────────────────┤
│                                             │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│ │  Card 1  │  │  Card 2  │  │  Card 3  │  │
│ │ [Image]  │  │ [Image]  │  │ [Image]  │  │
│ │ Name     │  │ Name     │  │ Name     │  │
│ │ Tag      │  │ Tag      │  │ Tag      │  │
│ │ [Edit]   │  │ [Edit]   │  │ [Edit]   │  │
│ └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│ ┌──────────┐                                │
│ │  Card 4  │                                │
│ │ [Image]  │                                │
│ │ Name     │                                │
│ │ Tag      │                                │
│ │ [Edit]   │                                │
│ └──────────┘                                │
└─────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop reordering
- Maximum 4 cards enforced
- Image upload with preview
- Active/inactive toggle
- Live preview button

**Add/Edit Form:**
```
┌─────────────────────────────────────────────┐
│ Add Landing Place                           │
├─────────────────────────────────────────────┤
│ Name: [_____________________________]       │
│                                             │
│ Tag: [_____________________________]        │
│                                             │
│ Description:                                │
│ [_________________________________________] │
│ [_________________________________________] │
│                                             │
│ Image:                                      │
│ ┌─────────────────┐                        │
│ │  Upload Image   │  [Preview]             │
│ └─────────────────┘                        │
│                                             │
│ Display Order: [___]                        │
│                                             │
│ ☑ Active                                    │
│                                             │
│ [Cancel]  [Save]                            │
└─────────────────────────────────────────────┘
```

---

## 4. Destinations Management

### 4.1 Destinations List

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Destinations                                │
│ [+ Add New]  [Search: ___________] [Filter]│
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [Img] Maldives          ⭐ 4.9          │ │
│ │       Asia • Honeymoon                  │ │
│ │       8 packages • Popular              │ │
│ │       [Edit] [Media] [Seasons] [Delete] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [Img] Switzerland       ⭐ 4.9          │ │
│ │       Europe • Luxury                   │ │
│ │       9 packages • Popular              │ │
│ │       [Edit] [Media] [Seasons] [Delete] │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Pagination: 1 2 3 ... 10]                  │
└─────────────────────────────────────────────┘
```

**Filters:**
- Region (All, Europe, Asia, Middle East, Africa, Oceania)
- Category (All, Honeymoon, Family, Adventure, Cultural)
- Status (All, Active, Inactive)
- Popular/New flags

### 4.2 Add/Edit Destination

**Form Tabs:**
```
┌─────────────────────────────────────────────┐
│ [Details] [Media] [Seasons] [Packages]      │
├─────────────────────────────────────────────┤
│ DETAILS TAB:                                │
│                                             │
│ Name: [_____________________________]       │
│ Slug: [_____________________________]       │
│                                             │
│ Country: [_____________________________]    │
│ Region: [Europe ▼]                          │
│ Category: [Honeymoon ▼]                     │
│                                             │
│ Short Description:                          │
│ [_________________________________________] │
│                                             │
│ Full Description:                           │
│ [_________________________________________] │
│ [_________________________________________] │
│ [_________________________________________] │
│                                             │
│ Rating: [4.9]                               │
│                                             │
│ Travel Type: [Luxury ▼]                     │
│ Season: [Summer ▼]                          │
│                                             │
│ ☑ Popular  ☑ New  ☑ Active                 │
│                                             │
│ Hero Image:                                 │
│ [Upload] [Preview]                          │
│                                             │
│ Thumbnail:                                  │
│ [Upload] [Preview]                          │
│                                             │
│ SEO:                                        │
│ Meta Title: [_____________________________] │
│ Meta Description:                           │
│ [_________________________________________] │
│                                             │
│ [Cancel]  [Save]                            │
└─────────────────────────────────────────────┘
```

### 4.3 Media Gallery Tab

```
┌─────────────────────────────────────────────┐
│ Media Gallery for: Maldives                 │
│ [+ Upload Images] [+ Add Video]             │
├─────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│ │ [Img1] │ │ [Img2] │ │ [Img3] │ │ [Img4] ││
│ │ ⭐     │ │        │ │        │ │        ││
│ │ [Edit] │ │ [Edit] │ │ [Edit] │ │ [Edit] ││
│ │ [Del]  │ │ [Del]  │ │ [Del]  │ │ [Del]  ││
│ └────────┘ └────────┘ └────────┘ └────────┘│
│                                             │
│ ┌────────┐ ┌────────┐                      │
│ │ [Vid1] │ │ [Vid2] │                      │
│ │ ▶      │ │ ▶      │                      │
│ │ [Edit] │ │ [Edit] │                      │
│ │ [Del]  │ │ [Del]  │                      │
│ └────────┘ └────────┘                      │
└─────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop reordering
- Mark as featured (⭐)
- Add title and caption
- Bulk upload
- Video URL input

### 4.4 Season Cards Tab

```
┌─────────────────────────────────────────────┐
│ Best Time to Visit: Maldives                │
│ [+ Add Season Card]                         │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Spring (Mar-May)                        │ │
│ │ Tag: Recommended                        │ │
│ │ Pleasant weather for scenic journeys... │ │
│ │ Icon: 🌸  Color: Green                  │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Summer (Jun-Aug)                        │ │
│ │ Tag: Best Time                          │ │
│ │ Peak season with best weather...        │ │
│ │ Icon: ☀️  Color: Yellow                 │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Season Card Form:**
```
┌─────────────────────────────────────────────┐
│ Add Season Card                             │
├─────────────────────────────────────────────┤
│ Title: [_____________________________]      │
│                                             │
│ From Month: [March ▼]                       │
│ To Month: [May ▼]                           │
│                                             │
│ Description:                                │
│ [_________________________________________] │
│ [_________________________________________] │
│                                             │
│ Tag: [_____________________________]        │
│                                             │
│ Icon: [🌸 ▼]                                │
│ Icon Color: [#10b981]  [Color Picker]      │
│ Background: [#f0fdf4]  [Color Picker]      │
│                                             │
│ [Cancel]  [Save]                            │
└─────────────────────────────────────────────┘
```

### 4.5 Packages Tab

```
┌─────────────────────────────────────────────┐
│ Packages for: Maldives                      │
│ [+ Map Package]                             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Maldives Luxury Escape - 5N/6D          │ │
│ │ Starting from ₹89,999                   │ │
│ │ Order: 1  Featured: ⭐                  │ │
│ │ [View Details] [Unmap] [↑] [↓]          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Maldives Budget Package - 4N/5D         │ │
│ │ Starting from ₹59,999                   │ │
│ │ Order: 2                                │ │
│ │ [View Details] [Unmap] [↑] [↓]          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Map Package Modal:**
```
┌─────────────────────────────────────────────┐
│ Map Package to Destination                  │
├─────────────────────────────────────────────┤
│ Select Package:                             │
│ [Search published packages...___________]   │
│                                             │
│ Results:                                    │
│ ○ Maldives Luxury Escape - 5N/6D            │
│ ○ Maldives Budget Package - 4N/5D           │
│ ○ Maldives Honeymoon Special - 6N/7D        │
│                                             │
│ Display Order: [___]                        │
│ ☐ Mark as Featured                          │
│                                             │
│ [Cancel]  [Map Package]                     │
└─────────────────────────────────────────────┘
```

---

## 5. Package Management

### 5.1 Packages List

```
┌─────────────────────────────────────────────┐
│ Packages                                    │
│ [View CRM Packages] [Search: ___] [Filter] │
├─────────────────────────────────────────────┤
│ Showing: Main Packages (Website Hierarchy)  │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Maldives Luxury Escape                  │ │
│ │ 5N/6D • ₹89,999 • Featured              │ │
│ │ Mapped to: Maldives                     │ │
│ │ Sub-packages: 3                         │ │
│ │ [Edit] [View Sub] [Remove]              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Switzerland Alpine Tour                 │ │
│ │ 7N/8D • ₹1,49,999                       │ │
│ │ Mapped to: Switzerland                  │ │
│ │ Sub-packages: 2                         │ │
│ │ [Edit] [View Sub] [Remove]              │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 5.2 Sub-Packages Manager

```
┌─────────────────────────────────────────────┐
│ Sub-Packages for: Maldives Luxury Escape    │
│ [+ Add Sub-Package]                         │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Deluxe Water Villa Option               │ │
│ │ 5N/6D • ₹99,999                         │ │
│ │ Order: 1                                │ │
│ │ [Edit] [Remove] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Beach Villa Option                      │ │
│ │ 5N/6D • ₹89,999                         │ │
│ │ Order: 2                                │ │
│ │ [Edit] [Remove] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 6. Visa Services Management

### 6.1 Visa Destinations List

```
┌─────────────────────────────────────────────┐
│ Visa Services                               │
│ [+ Add Visa Service] [Search: ___]          │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [Img] Schengen Visa                     │ │
│ │       For Europe itineraries            │ │
│ │       Processing: 15 days               │ │
│ │       [Edit] [Details] [Delete]         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [Img] UK Visa                           │ │
│ │       Visitor visa support              │ │
│ │       Processing: 10-15 days            │ │
│ │       [Edit] [Details] [Delete]         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 6.2 Add/Edit Visa Service

**Form Tabs:**
```
┌─────────────────────────────────────────────┐
│ [Basic Info] [Details] [Requirements]       │
├─────────────────────────────────────────────┤
│ BASIC INFO TAB:                             │
│                                             │
│ Title: [_____________________________]      │
│ Slug: [_____________________________]       │
│                                             │
│ Subtitle:                                   │
│ [_________________________________________] │
│                                             │
│ Description:                                │
│ [_________________________________________] │
│ [_________________________________________] │
│                                             │
│ Processing Time: [_____________________]    │
│ Support Info: [_________________________]   │
│                                             │
│ Card Image:                                 │
│ [Upload] [Preview]                          │
│                                             │
│ Hero Image:                                 │
│ [Upload] [Preview]                          │
│                                             │
│ Display Order: [___]                        │
│ ☑ Active                                    │
│                                             │
│ [Cancel]  [Save]                            │
└─────────────────────────────────────────────┘
```

**Details Tab:**
```
┌─────────────────────────────────────────────┐
│ Visa Facts & Information                    │
│ [+ Add Fact]                                │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Processing Time: 15 Days                │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Stay Period: 90 Days                    │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Overview Paragraphs:                        │
│ [+ Add Paragraph]                           │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Schengen visas are a common choice...  │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Requirements Tab:**
```
┌─────────────────────────────────────────────┐
│ Visa Requirements                           │
│ [+ Add Requirement]                         │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ Original passport with 6 months...   │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ Recent passport-size photographs...  │ │
│ │ [Edit] [Delete] [↑] [↓]                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Note:                                       │
│ [_________________________________________] │
│ [_________________________________________] │
└─────────────────────────────────────────────┘
```

---

## 7. Media Library

### 7.1 Media Browser

```
┌─────────────────────────────────────────────┐
│ Media Library                               │
│ [+ Upload] [Search: ___] [Filter: All ▼]   │
├─────────────────────────────────────────────┤
│ View: [Grid] [List]                         │
│                                             │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│ │ [Img1] │ │ [Img2] │ │ [Img3] │ │ [Img4] ││
│ │ 1.2 MB │ │ 890 KB │ │ 2.1 MB │ │ 1.5 MB ││
│ │ Used:2 │ │ Used:1 │ │ Used:0 │ │ Used:3 ││
│ │ [Info] │ │ [Info] │ │ [Info] │ │ [Info] ││
│ └────────┘ └────────┘ └────────┘ └────────┘│
│                                             │
│ [Load More...]                              │
└─────────────────────────────────────────────┘
```

**Filters:**
- Type (All, Images, Videos)
- Used/Unused
- Date uploaded
- Size

### 7.2 Media Details Modal

```
┌─────────────────────────────────────────────┐
│ Media Details                          [×]  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │         [Image Preview]                 │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Filename: maldives-beach.jpg                │
│ Size: 1.2 MB                                │
│ Dimensions: 1920x1080                       │
│ Uploaded: 2024-01-15                        │
│                                             │
│ URL:                                        │
│ [https://cdn.../maldives-beach.jpg] [Copy] │
│                                             │
│ Used in:                                    │
│ • Maldives destination (hero image)         │
│ • Landing page card #2                      │
│                                             │
│ [Delete Media]  [Close]                     │
└─────────────────────────────────────────────┘
```

---

## 8. Settings

### 8.1 General Settings

```
┌─────────────────────────────────────────────┐
│ Settings                                    │
│ [General] [Users] [API] [Cache]             │
├─────────────────────────────────────────────┤
│ Site Information:                           │
│ Site Name: [_____________________________]  │
│ Support Email: [_________________________]  │
│ Support Phone: [_________________________]  │
│                                             │
│ Default Settings:                           │
│ Default Image Quality: [80%]                │
│ Max Upload Size: [10 MB]                    │
│                                             │
│ [Save Changes]                              │
└─────────────────────────────────────────────┘
```

---

## 9. Preview & Publish

### 9.1 Preview Button
- Available on all edit screens
- Opens website preview in new tab
- Shows unpublished changes

### 9.2 Publish Workflow
- Changes saved as draft automatically
- "Publish" button to make live
- Confirmation modal before publishing
- Option to schedule publish time

---

## Summary

The CMS provides a comprehensive interface for managing all dynamic content on the Get2Vacation website. Each screen is designed for ease of use with:

- ✅ Intuitive navigation
- ✅ Drag-and-drop functionality
- ✅ Live previews
- ✅ Bulk operations
- ✅ Search and filtering
- ✅ Responsive design
- ✅ Activity logging
- ✅ Role-based access control

All screens follow consistent design patterns and provide clear feedback for user actions.
