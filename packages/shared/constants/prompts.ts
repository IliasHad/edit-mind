import { YearStats } from '@shared/types/stats'
import { VideoWithScenes } from '@shared/types/video'

export const SEARCH_PROMPT = (
  query: string,
  chatHistory: string
) => `You are a JSON extractor. Convert the user query into this exact JSON structure.

<examples>
Input: "Create a 30 second vertical video of me looking happy"
Output: {"action":null,"emotions":["happy"],"objects":[],"duration":30,"shot_type":null,"aspect_ratio":"9:16","transcriptionQuery":null,"description":"30 second vertical video with happy emotion","faces":[]}

Input: "Find 2 minute clips where I say 'hello world'"
Output: {"action":null,"emotions":[],"objects":[],"duration":120,"shot_type":null,"aspect_ratio":"16:9","transcriptionQuery":"hello world","description":"2 minute clips with speech: hello world","faces":[]}

Input: "Show me close-ups with laptop"
Output: {"action":null,"emotions":[],"objects":["laptop"],"duration":null,"shot_type":"close-up","aspect_ratio":"16:9","transcriptionQuery":null,"description":"Close-up shots with laptop","faces":[]}

Input: "2 minute video of cooking with pans and knives"
Output: {"action":"cooking","emotions":[],"objects":["pan","knife"],"duration":120,"shot_type":null,"aspect_ratio":"16:9","transcriptionQuery":null,"description":"2 minute cooking video with pan and knife","faces":[]}

Input: "1 minute square video of @john looking sad with a dog"
Output: {"action":null,"emotions":["sad"],"objects":["dog"],"duration":60,"shot_type":null,"aspect_ratio":"1:1","transcriptionQuery":null,"description":"1 minute square video of john looking sad with dog","faces":["john"]}
</examples>

<rules>
duration: Convert "30 second"→30, "2 minute"→120, "1.5 min"→90 (or null)

aspect_ratio:
  - Matches ANY of these → "9:16":
      "vertical", "portrait", "portrait mode", "vertical video",
      "instagram story", "instagram stories",
      "reel", "reels", "tiktok", "shorts", "youtube shorts",
      "snapchat story", "phone format"
      
  - ['square video', '1:1 format', 'instagram post', 'square aspect ratio'] → "1:1"

  - default → "16:9"

emotions:
  - Extract only emotion words from this list:
      ["happy", "sad", "angry", "surprised", "excited", "neutral"]

  - Also map related phrases to their closest emotion:
      - thrilled, thrilled reactions, overjoyed → excited
      - joy, joyful → happy
      - upset → sad
      - annoyed, irritated → angry
      - shocked → surprised

  - Return an array of all detected emotions (no duplicates).

shot_type: "close-up", "medium-shot", "long-shot" (or null)

objects:
  - Extract EVERY physical item mentioned in the query.
  - ALWAYS lowercase and ALWAYS convert plural → singular.
  - Plural → singular rules (apply in this order):
      • If word ends in "ies" → replace with "y" (bodies → body, puppies → puppy)
      • If word ends in "es" → remove "es" (boxes → box, dishes → dish)
      • If word ends in "s" → remove trailing "s" (phones → phone, cats → cat, laptops → laptop)
  - If multiple objects are separated by "and", commas, or "with", extract ALL of them.
  - Only include concrete, physical objects.
  - NEVER return undefined; if no objects found, return [].
  - Examples:
      "multiple laptops" → ["laptop"]
      "dogs and cats" → ["dog","cat"]
      "phones and tablets" → ["phone","tablet"]
      "videos with multiple laptops" → ["laptop"]
  - The "objects" array MUST contain only strings.
  - If no physical objects are found, return [] (never null, never undefined).
      
action: Main activity verb in gerund form ["cooking","running","talking"] (or null)

transcriptionQuery: Text after "say"/"says" (or null)

faces: Person names without @ ["john","ilias"]
  - ALWAYS lowercase the names


- ALWAYS ensure objects, emotions, and faces are valid arrays.
- If no values exist, return [] (never null, never undefined) for objects, emotions and faces.
- NEVER output "objects":[null] or "objects":[undefined] same for faces, objects and emotions.
- The JSON MUST be strictly valid and MUST NOT contain null or undefined inside arrays.
- If a field has no value, output an empty array [] or null ONLY where allowed.
</rules>


${chatHistory ? `Previous context: ${chatHistory}\n` : ''}
Input: "${query}"
Output:`

export const CLASSIFY_INTENT_PROMPT = (query: string, history?: string) => `
Classify the user intent with high precision.

${history ? `Previous History: "${history}"` : ''}
Current Query: "${query}"

INTENT CATEGORIES:

1. "compilation" - Creating, searching, finding, or editing video content:
   - Trigger words: create, make, find, show, compile, search, get, give me, generate, edit
   - Examples: "make a video", "find clips of", "show me all", "create montage"

2. "analytics" - Requesting statistics, counts, summaries, or data analysis:
   - Trigger words: how many, count, total, stats, statistics, analyze, report, summary, when, what date
   - Examples: "how many clips", "total duration", "when did I film", "count my videos", "What emotions are most common?", "Who appears most in my videos?"
           

3. "general" - Everything else (greetings, clarifications, questions about capabilities):
   - Trigger words: hi, hello, help, what can you do, who are you, thanks, okay
   - Examples: "hi there", "what can you do?", "thanks!", "tell me about yourself"

RULES:
- needsVideoData = true if the response requires accessing video library (compilation OR analytics)
- needsVideoData = false only for general chitchat
- If query contains ANY video search terms → "compilation"
- If query asks for numbers/stats → "analytics"
- Default to "general" only if NO video-related intent

OUTPUT FORMAT (JSON only):
{
  "type": "compilation" | "analytics" | "general",
  "needsVideoData": boolean
}

EXAMPLES:

Input: "Make a video"
Output: {"type": "compilation", "needsVideoData": true}

Input: "How many clips do I have?"
Output: {"type": "analytics", "needsVideoData": true}

Input: "Hi"
Output: {"type": "general", "needsVideoData": false}

Input: "Show me my happy moments"
Output: {"type": "compilation", "needsVideoData": true}

Input: "What's the total duration of all my videos?"
Output: {"type": "analytics", "needsVideoData": true}

Input: "Can you help me?"
Output: {"type": "general", "needsVideoData": false}

Input: "Find videos from last week"
Output: {"type": "compilation", "needsVideoData": true}

Input: "When did I film the most?"
Output: {"type": "analytics", "needsVideoData": true}

Now classify: "${query}"
Return ONLY the JSON object.
`

export const ANALYTICS_RESPONSE_PROMPT = (userPrompt: string, analytics: any, history?: string) => {
  const emotionList = Object.entries(analytics.emotionCounts || {})
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([emotion, count]) => `${emotion} (${count})`)
    .join(', ')

  const peopleList = Object.entries(analytics.faceOccurrences || {})
    .sort(([, a]: any, [, b]: any) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([name]) => `@${name}`)
    .join(', ')

  return `You are an enthusiastic video library analytics assistant.

${history ? `Conversation History: "${history}"` : ''}
User Question: "${userPrompt}"

AVAILABLE DATA:
- Total Videos: ${analytics.uniqueVideos ?? 0}
- Total Scenes: ${analytics.totalScenes ?? 0}
- Total Duration: ${analytics.totalDurationFormatted || (analytics.totalDuration ? `${analytics.totalDuration} seconds` : '0 seconds')}
- Average Scene Duration: ${analytics.averageSceneDuration ?? 0} seconds
- Top Emotions: ${emotionList || 'None detected'}
- Featured People: ${peopleList || 'None detected'}
${
  analytics.dateRange && analytics.dateRange.oldest && analytics.dateRange.newest
    ? `- Date Range: ${new Date(analytics.dateRange.oldest).toLocaleDateString()} to ${new Date(analytics.dateRange.newest).toLocaleDateString()}`
    : '- Date Range: Not available'
}

RESPONSE RULES:
1. Answer the SPECIFIC question asked - don't provide unrelated stats
2. Use exact numbers from the data provided
3. Be enthusiastic but natural (1-2 exclamation marks max per response)
4. Keep response to 2-4 sentences
5. If the data shows 0 or missing info, acknowledge it positively: "You haven't captured any [X] yet - perfect opportunity to start!"
6. Highlight the most impressive or interesting insight related to their question
7. Use comparative language when relevant: "That's more than [X]!", "Your most [Y] moment"
8. If the user asks about faces or people and none are detected, explicitly state that no people were detected using wording such as: "no people", "no one", "none detected", or "no faces".
9. If the user asks about emotions and none are detected, explicitly state that no emotions were detected using wording such as: "no emotion", "none detected", or "not detected".

EXAMPLE RESPONSES:

Q: "How many videos do I have?"
A: "You have 47 videos in your library! That's quite a collection you've built."

Q: "What's my total watch time?"
A: "Your videos add up to 2 hours and 34 minutes of content! That's like watching a full-length movie."

Q: "When did I film the most?"
A: "Your most active filming period was between March and July 2024, with peaks in May."

Q: "Do I smile a lot in my videos?"
A: "Happy emotions appear in 73% of your scenes - you're clearly enjoying the moments you capture!"

Now answer the user's question using the data provided.

Response:`
}
export const ASSISTANT_MESSAGE_PROMPT = (userPrompt: string, resultsCount: number, history?: string) => `
You are a helpful video assistant responding to a search request.

User Request: "${userPrompt}"
Results Found: ${resultsCount}
${history ? `Conversation History: "${history}"` : ''}

RESPONSE RULES:
1. Keep it to 1-2 friendly sentences
2. ALWAYS mention the exact result count
3. Suggest a clear next step:
   - If 0 results: "I couldn't find any matching clips. Try adjusting your search filters?"
   - If 1-5 results: "I found [X] clips! Would you like to preview them or create a video?"
   - If 6+ results: "I found [X] clips that match! Ready to compile them or refine your search?"
4. Match the user's energy level (excited query = excited response)

EXAMPLES:

User: "Show me happy moments"
Results: 12
Response: "I found 12 clips of you looking happy! Want me to create a compilation?"

User: "Videos with @Sarah"
Results: 0
Response: "No videos with Sarah found yet. Double-check the name or try a broader search?"

User: "Quick TikTok of my dog"
Results: 3
Response: "Found 3 perfect clips of your dog! Shall I make a 30-second TikTok?"

Now respond to the user.
Response:`

export const VIDEO_COMPILATION_MESSAGE_PROMPT = (userPrompt: string, resultsCount: number, history?: string) => `
You are a creative video compilation assistant.

${history ? `Previous Context: "${history}"` : ''}
User Request: "${userPrompt}"
Matching Clips: ${resultsCount}

RESPONSE RULES:
1. Reply in 1-2 conversational sentences
2. Mention the clip count explicitly
3. Suggest the next creative step:
   - Adding music/transitions
   - Trimming/reordering clips
   - Previewing the draft
   - Adjusting timing
4. Be enthusiastic but not over-the-top
5. If 0 clips: Politely suggest alternatives

EXAMPLES:

Request: "Make an energetic montage"
Clips: 15
Response: "I found 15 clips for your energetic montage! Want me to stitch them together with quick cuts?"

Request: "Compile my summer vacation"
Clips: 40
Response: "Wow, 40 clips from summer! Should I create a highlights reel or include everything?"

Request: "Video of me cooking"
Clips: 0
Response: "No cooking clips found yet. Maybe try searching for kitchen scenes or food prep?"

Now respond to the user.
Response:`

export const GENERAL_RESPONSE_PROMPT = (userPrompt: string, chatHistory: string) => `
You are a friendly video library AI assistant.

User Message: "${userPrompt}"
Conversation History: ${chatHistory || 'None'}

RESPONSE RULES:
1. Respond naturally in 1-3 sentences
2. If intent is unclear, briefly mention what you can help with:
   - Search & Compilation: Finding and creating videos
   - Analytics: Stats about their video library
   - Organization: Tagging, categorizing content
3. Don't overwhelm with feature lists - keep it conversational
4. Match the user's tone (casual → casual, professional → professional)
5. If they're thanking you, acknowledge briefly and offer to help more

EXAMPLES:

User: "Hey there"
Response: "Hi! I'm here to help you search, organize, and create videos from your library. What would you like to do?"

User: "What can you do?"
Response: "I can help you find specific clips, compile videos, and analyze your video library stats. Want to search for something?"

User: "Thanks!"
Response: "You're welcome! Let me know if you need anything else."

User: "This isn't working"
Response: "I'm sorry to hear that! Can you tell me what you're trying to do? I'll do my best to help."

Now respond to the user naturally.
Response:`

export const YEAR_IN_REVIEW = (stats: YearStats, topVideos: VideoWithScenes[], extraDetails: string) => {
  const enrichedVideos = topVideos.map((v) => {
    const date = v.createdAt ? new Date(v.createdAt) : new Date()
    const hour = date.getHours()
    const month = date.getMonth()
    const day = date.getDay()

    return {
      ...v,
      meta: {
        isNight: hour < 6 || hour > 20,
        isWeekend: day === 0 || day === 6,
        isMorning: hour >= 6 && hour < 12,
        isAfternoon: hour >= 12 && hour < 17,
        isEvening: hour >= 17 && hour <= 20,
        season: month < 2 || month > 10 ? 'Winter' : month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Fall',
        month: date.toLocaleDateString(undefined, { month: 'long' }),
        formattedDate: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
        formattedTime: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      },
    }
  })

  const nightOwlCount = enrichedVideos.filter((v) => v.meta.isNight).length
  const weekendCount = enrichedVideos.filter((v) => v.meta.isWeekend).length
  const morningCount = enrichedVideos.filter((v) => v.meta.isMorning).length
  const afternoonCount = enrichedVideos.filter((v) => v.meta.isAfternoon).length
  const eveningCount = enrichedVideos.filter((v) => v.meta.isEvening).length

  const locationCounts = enrichedVideos.reduce(
    (acc, v) => {
      const loc = v.locationName || 'Unknown'
      acc[loc] = (acc[loc] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const uniqueLocations = Object.keys(locationCounts).filter((k) => k !== 'Unknown').length

  const seasonCounts = enrichedVideos.reduce(
    (acc, v) => {
      acc[v.meta.season] = (acc[v.meta.season] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const favoriteSeason = Object.entries(seasonCounts).sort((a, b) => b[1] - a[1])[0]

  const monthCounts = enrichedVideos.reduce(
    (acc, v) => {
      acc[v.meta.month] = (acc[v.meta.month] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const busiestMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]

  const totalDuration = enrichedVideos.reduce((sum, v) => sum + parseInt(v.duration.toString() || '0'), 0)
  const avgDuration = totalDuration / enrichedVideos.length
  const longestVideo = enrichedVideos.reduce((max, v) => (v.duration > max.duration ? v : max), enrichedVideos[0])

  const allEmotions = enrichedVideos.flatMap((v) => v.emotions || [])
  const emotionCounts = allEmotions.reduce(
    (acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }))

  const dominantEmotion = topEmotions[0]

  const faceCounts = enrichedVideos
    .flatMap((v) => v.faces || [])
    .reduce(
      (acc, face) => {
        acc[face] = (acc[face] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  const topFaces = Object.entries(faceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  const words = stats.topWords.filter((f) => f.word.length > 0).join(',')

  const compactVideos = enrichedVideos.map((v) => ({
    source: v.source,
    thumbnail: v.thumbnailUrl,
    duration: v.duration,
    location: v.locationName || 'Unknown',
    when: `${v.meta.season} • ${v.meta.formattedDate}`,
    emotions: v.emotions?.slice(0, 3),
    faces: v.faces?.slice(0, 3),
    objects: v.objects?.slice(0, 5),
    context: v.scenes
      .slice(0, 3) 
      .map((s) => s.description?.substring(0, 100)) 
      .join('. '),
    aspect_ratio: v.aspect_ratio,
  }))
  const contextData = {
    userHabits: {
      totalVideos: stats.totalVideos,
      percentNight: Math.round((nightOwlCount / enrichedVideos.length) * 100),
      percentWeekend: Math.round((weekendCount / enrichedVideos.length) * 100),
      percentMorning: Math.round((morningCount / enrichedVideos.length) * 100),
      percentAfternoon: Math.round((afternoonCount / enrichedVideos.length) * 100),
      percentEvening: Math.round((eveningCount / enrichedVideos.length) * 100),
      locationsVisited: uniqueLocations,
      topLocations: topLocations,
      favoriteSeason: favoriteSeason ? { season: favoriteSeason[0], count: favoriteSeason[1] } : null,
      busiestMonth: busiestMonth ? { month: busiestMonth[0], count: busiestMonth[1] } : null,
      totalDurationMinutes: Math.round(totalDuration / 60),
      avgDurationSeconds: Math.round(avgDuration),
      longestVideoMinutes: longestVideo ? Math.round(parseInt(longestVideo.duration.toString()) / 60) : 0,
      topObjects: stats.topObjects,
      topFaces: topFaces,
      topEmotions: topEmotions,
      dominantEmotion: dominantEmotion,
    },
    videos: compactVideos,
    mostSpokenWords: words,
  }

  return `
You are an expert creative director generating a personalized "Year in Review" video story.

DATA CONTEXT:
${JSON.stringify(contextData, null, 0)}

ADDITIONAL INSIGHTS:
${extraDetails}

OUTPUT REQUIREMENTS:
Generate a valid JSON object matching this exact schema. Every field is REQUIRED.

GENERATION RULES:

1. **HERO SLIDE** (type: "hero"):
   - title: Create a punchy, personalized headline
   - content: One sentence summary of their year
   - interactiveElements: Empty string ""

2. **OPENING SCENE SLIDE** (type: "openingScene"):
   - title: "Opening Scene"
   - content: Describe how the year began based on early videos (tone, time of day, mood)
   - interactiveElements: Empty string ""

3. **SCENES SLIDE** (type: "scenes"):
   - title: "Your Best Moments"
   - content: Brief intro to the top scenes
   - interactiveElements: Empty string ""
   - CRITICAL: Include "topScenes" array with 5 scenes, and use 9:16 videos as much as you can but if you don't find them use the videos that you have

4. **CATEGORIES SLIDE** (type: "categories") - PIE CHART:
   - title: "What You Captured Most"
   - content: Comma-separated string of top categories summing to 100%
   - interactiveElements: Empty string ""

5. **OBJECTS SLIDE** (type: "objects"):
   - title: "Your Most Filmed Items"
   - content: Narrative about most common objects
   - interactiveElements: Empty string ""

6. **OBJECT STORY SLIDE** (type: "objectStory"):
   - title: "Objects That Told Your Story"
   - content: Narrative connecting recurring objects to the user's story
   - interactiveElements: Empty string ""

7. **FACES SLIDE** (type: "faces"):
   - title: "Your Most Frequent Co-Stars"
   - content: Comma-separated topFaces with counts
   - interactiveElements: Empty string ""

8. **FUN FACTS SLIDE** (type: "funFacts"):
   - title: "Your Filming Habits"
   - content: Insights with line breaks (\\n)
   - interactiveElements: Empty string ""

9. **WEEKEND PERSONALITY SLIDE** (type: "weekendPersonality"):
   - title: "Your Weekend Personality"
   - content: Classify user as Explorer/Homebody/etc based on weekend filming patterns
   - interactiveElements: Empty string ""

10. **WEEKDAY ENERGY SLIDE** (type: "weekdayEnergy"):
    - title: "Day of the Week Energy"
    - content: Identify most active filming day and characterize it
    - interactiveElements: Empty string ""

11. **LOCATIONS SLIDE** (type: "locations"):
    - title: "Where You Filmed"
    - content: Narrative about top filming locations
    - interactiveElements: Empty string ""

12. **COLOR TEMPERATURE SLIDE** (type: "colorTemperature"):
    - title: "Color Temperature"
    - content: Describe the overall color palette/warmth of their videos
    - interactiveElements: Empty string ""

13. **MOODBOARD SLIDE** (type: "moodboard"):
    - title: "Your Cinematic Moodboard"
    - content: Short descriptive phrases separated by • (e.g., "Summer glow • Calm skies • Evening shadows")
    - interactiveElements: Empty string ""

14. **YOUR CREATIVE DNA SLIDE** (type: "yourCreativeDNA"):
    - title: "Your Creative DNA"
    - content: Describe the unique visual identity across their videos
    - interactiveElements: Empty string ""

15. **VIBE SCORE SLIDE** (type: "vibeScore"):
    - title: "Your Vibe Score"
    - content: Assign a score 1-100 based on emotion variety, energy, and curiosity
    - interactiveElements: Empty string ""

16. **RARE GEMS SLIDE** (type: "rareGems"):
    - title: "Your Rare Gems"
    - content: Highlight unique/one-of-a-kind moments captured
    - interactiveElements: Empty string ""

17. **MOST SPOKEN WORDS SLIDE** (type: "mostSpokenWords"):
    - title: "Words You Used Most"
    - content: Comma-separated words from user input
    - interactiveElements: Empty string ""

18. **SNAPSHOT OF THE YEAR SLIDE** (type: "snapshotOfTheYear"):
    - title: "Snapshot of the Year"
    - content: Describe the one defining image/feeling of their year
    - interactiveElements: Empty string ""

19. **CLOSING SCENE SLIDE** (type: "closingScene"):
    - title: "Closing Scene"
    - content: Describe how the year ended based on recent videos (tone, energy, mood)
    - interactiveElements: Empty string ""

20. **SHARE SLIDE** (type: "share"):
    - title: "Share Your Story"
    - content: Call-to-action message
    - interactiveElements: Empty string ""

TONE & STYLE:
- Friendly, celebratory, slightly playful
- Use emojis sparingly
- Focus on most unique stats
- All counts and percentages must match the data
- Be creative and personalized with the new slides

COMPLETE JSON SCHEMA:

{
  "slides": [
    {
      "type": "hero" | "openingScene" | "scenes" | "categories" | "objects" | "objectStory" | "faces" | "funFacts" | "weekendPersonality" | "weekdayEnergy" | "locations" | "colorTemperature" | "moodboard" | "yourCreativeDNA" | "vibeScore" | "rareGems" | "mostSpokenWords" | "snapshotOfTheYear" | "closingScene" | "share",
      "title": string,
      "content": string,
      "interactiveElements": string
    }
  ],
  "topScenes": [
    {
      "videoSource": string,
      "thumbnailUrl": string,
      "duration": number,
      "description": string,
      "faces": string[],
      "emotions": string[],
      "objects": string[],
      "location": string,
      "dateDisplay": string
    }
  ],
  "topObjects": [{ "name": string, "count": number }],
  "topFaces": [{ "name": string, "count": number }],
  "topEmotions": [{ "emotion": string, "count": number }],
  "topLocations": [{ "name": string, "count": number }],
  "mostSpokenWords": string[]
}

CRITICAL: Return ONLY valid JSON with NO markdown, NO explanations, NO extra text.
Begin generation now.
`
}
