# Image Support Implementation Plan

## Current Status ✅

**Already Implemented:**
- Database schema supports images (`image_urls TEXT[]`, `image_descriptions TEXT[]`)
- Study mode displays **single image** (`currentWord.image_url`)
- Image URLs are correctly extracted from database (`image_urls?.[0]`)
- Basic image UI with responsive design in `app/study/page.tsx:593-603`
- Alt text for accessibility

## Missing Features ❌

**Requirements from docs not yet implemented:**

### 1. Image Carousel System
- **Requirement**: Up to 5 images per word in carousel format
- **Current**: Only displays first image (`image_urls?.[0]`)
- **Gap**: No carousel navigation or multiple image display

### 2. Image Descriptions
- **Requirement**: Each image has description explaining connection to word
- **Current**: No descriptions displayed 
- **Gap**: `image_descriptions` array not used in UI

### 3. Image Toggle Controls
- **Requirement**: Students can toggle images/descriptions on/off
- **Current**: Images always shown if available
- **Gap**: No user controls for image visibility

### 4. Image Generation System
- **Requirement**: Gemini AI generates 5 cartoon-style images per word
- **Current**: Database supports it, but no generation tool active
- **Gap**: Need to populate `image_urls` and `image_descriptions` arrays

## Implementation Milestone

### Phase 1: Image Carousel Component (4-6 hours)
- Create `components/study/ImageCarousel.tsx` component
- Support navigation through multiple images (dots, arrows)
- Display image descriptions below each image
- Add keyboard navigation support (arrow keys)
- Integrate with existing study mode UI

### Phase 2: Image Controls (2-3 hours)
- Add toggle buttons for images on/off
- Add toggle for descriptions on/off
- Persist preferences in localStorage
- Add accessibility features (screen reader support)
- Add to both study and review modes

### Phase 3: Image Generation (6-8 hours)
- Enhance `tools/word-details-generator/` 
- Generate 5 cartoon-style images per word using Gemini AI
- Upload to Vercel storage with organized folder structure (`/words/top-25/`, etc.)
- Update database with multiple image URLs and descriptions
- Process all 500 words from `docs/WORDS.md`

### Phase 4: Review Mode Integration (2-3 hours)
- Add image carousel to `app/review/page.tsx`
- Ensure consistent image experience across study/review modes
- Update typed recall interface to include images

## Technical Implementation Details

### Database Schema (Already Ready)
```sql
-- words table already has:
image_urls TEXT[] DEFAULT '{}',        -- Array of Vercel image URLs  
image_descriptions TEXT[] DEFAULT '{}' -- Array of descriptions for each image
```

### Component Structure
```
components/
├── study/
│   ├── ImageCarousel.tsx      # New - Multi-image carousel
│   └── ImageToggleControls.tsx # New - Show/hide controls
└── ui/
    └── ImageCarousel.tsx      # Shared carousel component
```

### File Locations to Modify
- `app/study/page.tsx:593-603` - Replace single image with carousel
- `app/review/page.tsx` - Add image carousel  
- `tools/word-details-generator/` - Enhance for multi-image generation
- `lib/word-state-manager.ts` - May need image preference handling

## Priority Order
1. **Image Carousel** - Core visual learning feature
2. **Image Generation** - Populate content for all 500 words  
3. **Toggle Controls** - User customization
4. **Review Integration** - Feature parity

## Acceptance Criteria

### Phase 1 Complete When:
- ✅ Students can navigate through multiple images per word
- ✅ Image descriptions display below each image
- ✅ Carousel works on mobile and desktop
- ✅ Keyboard navigation functional

### Phase 2 Complete When:
- ✅ Students can toggle images on/off
- ✅ Students can toggle descriptions on/off  
- ✅ Preferences persist across sessions
- ✅ Accessible for screen readers

### Phase 3 Complete When:
- ✅ All 500 words have 5 cartoon-style images
- ✅ Images stored in organized Vercel folders
- ✅ Database populated with image URLs and descriptions
- ✅ Images load quickly via CDN

### Phase 4 Complete When:
- ✅ Review mode has same image experience as study mode
- ✅ Typed recall includes image carousel
- ✅ Consistent UI/UX across all learning modes

## Estimated Timeline
**Total: 14-20 hours for complete image system**

- Phase 1: 4-6 hours
- Phase 2: 2-3 hours  
- Phase 3: 6-8 hours
- Phase 4: 2-3 hours

## Notes
The foundation is solid - database schema and basic display work. Main gap is the carousel component and content generation pipeline. This will significantly enhance the visual learning experience as specified in the PRD requirements.