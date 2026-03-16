// =============================================
// Heathway AI — Advanced Smart Response Engine
// The Heathway Dental Surgery, Dagenham
// Replaces getFallbackResponse with full
// keyword-scoring, context-tracking, fuzzy
// matching, sentiment detection, and 60+
// topic categories with multiple variants.
// =============================================

// ── Helpers ──────────────────────────────────
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const phone = "<a href='tel:02085925030' style='color:var(--teal);font-weight:600'>020 8592 5030</a>";
const phoneInline = "<a href='tel:02085925030' style='color:var(--teal)'>020 8592 5030</a>";

// ── Conversation Context ──────────────────────
const conversationContext = {
    lastTopic: null,
    topicsDiscussed: [],
    messageCount: 0,
    sentiment: 'neutral'   // 'positive' | 'neutral' | 'frustrated' | 'anxious' | 'confused'
};

// ── Levenshtein Distance (fuzzy matching) ─────
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// Does a single word approximately match a single-word keyword token?
// Partial match: keyword is a prefix/suffix present in the word (or vice versa).
// Fuzzy: Levenshtein <= 1 for words up to 8 chars; <= 2 for words >= 9 chars.
// Strict: does NOT match short words (< 4 chars) unless exact.
function wordMatchesSingleKeyword(word, keyword) {
    if (word === keyword) return true;
    // word contains the keyword stem (e.g. "whitening" contains "whiten")
    if (keyword.length >= 4 && word.includes(keyword)) return true;
    // keyword contains the word — only valid if word is at least 70% of keyword length
    // This prevents short words like "tooth" matching long keywords like "toothache"
    if (word.length >= 4 && keyword.length >= 4 && keyword.includes(word)) {
        if (word.length >= keyword.length * 0.7) return true;
    }
    // Fuzzy typo correction: both tokens must be at least 6 chars
    if (keyword.length >= 6 && word.length >= 6) {
        const dist = levenshtein(word, keyword);
        // Allow dist=1 freely; allow dist=2 only for longer words (>= 9 chars)
        const maxDist = (keyword.length >= 9 && word.length >= 9) ? 2 : 1;
        return dist <= maxDist;
    }
    return false;
}

// Score a topic's keyword list against the message.
// Multi-word keywords (containing a space) are matched against the full message string.
// Single-word keywords are matched against individual word tokens.
function scoreKeywords(words, keywordList) {
    let score = 0;
    const fullMsg = words.join(' ');
    for (const kw of keywordList) {
        const kwNorm = kw.toLowerCase();
        if (kwNorm.includes(' ')) {
            // Multi-word keyword: check if it appears in the full message
            if (fullMsg.includes(kwNorm)) {
                score++;
            }
        } else {
            // Single-word keyword: check against each word token
            let matched = false;
            for (const w of words) {
                if (wordMatchesSingleKeyword(w, kwNorm)) {
                    matched = true;
                    break;
                }
            }
            if (matched) score++;
        }
    }
    return score;
}

// ── Sentiment Detection ───────────────────────
function detectSentiment(msg) {
    if (/\b(urgent|hurting|agony|unbearable|terrified|scared|panic|help me|please help|desperate|worst|never coming back|hate|stupid|useless|rubbish|awful|terrible|pathetic)\b/.test(msg)) {
        return 'frustrated';
    }
    if (/\b(nervous|anxious|worried|afraid|fear|phobia|scared|dread)\b/.test(msg)) {
        return 'anxious';
    }
    if (/\b(amazing|brilliant|great|love|wonderful|excellent|fantastic|perfect|thank|thanks|cheers|appreciate|helpful)\b/.test(msg)) {
        return 'positive';
    }
    if (/^.{0,15}$/.test(msg) && /(\?|huh|what|eh|pardon|sorry|don't get|confused|unclear)/.test(msg)) {
        return 'confused';
    }
    return 'neutral';
}

// ── Topic Knowledge Base ──────────────────────
// Each topic: { id, keywords, weight, priority, responses[] }
// weight  — base score multiplier (default 1)
// priority — if >0, overrides scoring (checked in order)

const topics = [

    // ════════════════════════════════════════
    // PRIORITY 10 — Emergencies (always win)
    // ════════════════════════════════════════
    {
        id: 'emergency_severe',
        priority: 10,
        keywords: ['emergency','agony','unbearable','excruciating','severe pain','my face is swelling','face swelling','facial swelling','abscess','knocked out my tooth','tooth knocked out','avulsed tooth','broken tooth','jaw broke','blood won\'t stop','can\'t open my mouth','cannot open my mouth','tooth fell out','lost my tooth','swollen face','my tooth is cracked','cracked tooth'],
        weight: 10,
        responses: [
            "&#x1F6A8; <strong>Dental Emergency</strong><br><br>Please call us immediately:<br><br>&#x1F4DE; "+phone+"<br><br>We'll fit you in as soon as possible. If outside our hours (Mon&ndash;Fri 9am&ndash;5pm) please call <strong>NHS 111</strong> or attend your nearest A&E for facial swelling.<br><br><strong>Quick first aid:</strong><br>&#x2022; <strong>Toothache</strong> &mdash; rinse with warm salt water, take paracetamol or ibuprofen<br>&#x2022; <strong>Knocked-out tooth</strong> &mdash; store in milk or saliva, come immediately (time is critical)<br>&#x2022; <strong>Swelling</strong> &mdash; apply a cold compress to cheek, 10 min on / 10 min off<br>&#x2022; <strong>Bleeding</strong> &mdash; bite firmly on clean gauze or cloth for 20 minutes<br>&#x2022; <strong>Broken tooth</strong> &mdash; save any pieces, rinse gently with water, call us",
            "&#x1F6A8; <strong>This sounds urgent!</strong><br><br>Please call us right away on "+phone+". We'll do everything we can to see you today.<br><br>If you are outside our opening hours (Mon&ndash;Fri 9am&ndash;5pm):<br>&#x2022; Call <strong>NHS 111</strong> for dental urgent care guidance<br>&#x2022; For facial swelling affecting your breathing &mdash; call <strong>999</strong> immediately<br><br><strong>While you wait:</strong><br>&#x2022; Paracetamol or ibuprofen for pain (follow packet doses)<br>&#x2022; Cold compress on cheek for swelling<br>&#x2022; Keep a knocked-out tooth in cold milk",
            "&#x26A0;&#xFE0F; <strong>Dental Emergency &mdash; Act Now</strong><br><br>Don't wait &mdash; call "+phone+" and explain you have an emergency. We reserve time for urgent cases every day.<br><br><strong>Out of hours?</strong> Call NHS 111 or visit 111.nhs.uk for an urgent dental referral.<br><br><strong>First aid reminders:</strong><br>&#x2022; Pain &mdash; warm salt water rinse + paracetamol/ibuprofen<br>&#x2022; Knocked-out adult tooth &mdash; don't clean it, store in milk, get here fast<br>&#x2022; Abscess swelling &mdash; never squeeze, see us or NHS 111 urgently<br>&#x2022; Persistent bleeding &mdash; firm pressure with gauze for 20 mins",
            "&#x1F6A8; <strong>Don't Delay &mdash; Dental Emergencies Need Prompt Care</strong><br><br>Call "+phone+" right now. Our team always makes room for urgent cases.<br><br><strong>What counts as a dental emergency?</strong><br>&#x2022; Severe toothache that isn't responding to painkillers<br>&#x2022; Facial or jaw swelling (especially rapid swelling)<br>&#x2022; Knocked-out or displaced adult tooth<br>&#x2022; Uncontrolled bleeding from the mouth<br>&#x2022; A dental abscess<br>&#x2022; Broken tooth with sharp edges<br><br><strong>Important:</strong> Facial swelling that spreads to your neck or eye area &mdash; go to A&E or call 999 immediately.",
            "&#x26A0;&#xFE0F; <strong>Emergency Dental Care</strong><br><br>Call us immediately on "+phone+". We aim to see genuine emergencies the same day.<br><br><strong>Out of hours first aid:</strong><br>&#x2022; <strong>Abscess:</strong> Do NOT squeeze. Take ibuprofen to reduce inflammation. Call NHS 111.<br>&#x2022; <strong>Avulsed (knocked-out) tooth:</strong> Hold by the crown (not root), rinse briefly in clean water, replace in socket if possible or store in milk. Time is everything &mdash; within 30 minutes gives best chance of saving the tooth.<br>&#x2022; <strong>Bleeding:</strong> Roll up gauze, bite firmly for 20 minutes continuously.<br>&#x2022; <strong>Broken denture or sharp edge:</strong> Cover with dental wax from a pharmacy.",
            "&#x1F6A8; <strong>We're Here for Dental Emergencies</strong><br><br>"+phone+"<br><br>We keep emergency slots available every day. Please call first thing when we open (9am Mon&ndash;Fri) and explain your symptoms clearly.<br><br><strong>Reduce pain while waiting:</strong><br>&#x2022; Adults: alternate paracetamol (1g) and ibuprofen (400mg) every 2&ndash;3 hours for better pain control<br>&#x2022; Apply a small amount of clove oil to the affected area for temporary numbing<br>&#x2022; Rinse with warm salt water (1 teaspoon per glass)<br>&#x2022; Avoid extremes of temperature in food and drink<br><br>Out of hours: call NHS 111 (free, 24/7)."
        ]
    },
    {
        id: 'toothache',
        priority: 9,
        keywords: ['toothache','tooth ache','tooth hurts','teeth hurt','throbbing','aching','pain in tooth','sore tooth','dental pain'],
        weight: 8,
        responses: [
            "&#x1F915; <strong>Toothache</strong><br><br>Don't suffer &mdash; call us on "+phone+" for an urgent appointment.<br><br><strong>While you wait:</strong><br>&#x2022; Take paracetamol or ibuprofen (follow packet instructions, do not exceed dose)<br>&#x2022; Rinse with warm salt water<br>&#x2022; Avoid very hot, cold, or sweet foods<br>&#x2022; Do <strong>not</strong> place aspirin directly on the gum &mdash; it can cause a chemical burn<br>&#x2022; Clove oil on a cotton bud can provide temporary numbing<br><br>Toothache may indicate decay, a cracked tooth, or infection. The sooner we see you, the simpler the fix.",
            "&#x1F915; <strong>Toothache &mdash; Don't Wait</strong><br><br>Toothache rarely goes away on its own and can get worse quickly. Call "+phone+" and we'll fit you in.<br><br><strong>Temporary relief:</strong><br>&#x2022; Ibuprofen (400mg) is often more effective for dental pain than paracetamol, but both are fine<br>&#x2022; Warm salt water rinsing helps reduce bacteria<br>&#x2022; Clove oil (eugenol) is a natural temporary anaesthetic<br>&#x2022; Avoid lying flat &mdash; keeping your head elevated reduces throbbing<br><br>Our team is experienced in treating dental pain quickly and comfortably.",
            "&#x1F915; <strong>We're Sorry You're in Pain</strong><br><br>Toothache can be miserable. Here's what to do:<br><br>1. Call "+phone+" &mdash; we'll prioritise urgent pain cases<br>2. Take your normal pain relief (paracetamol and/or ibuprofen)<br>3. Rinse gently with warm salt water<br>4. Avoid triggers (hot/cold/sweet foods)<br><br>If your face is swelling, you have a fever, or pain is spreading &mdash; this is more urgent. Call us or NHS 111 immediately.",
            "&#x1F915; <strong>Toothache Relief Tips</strong><br><br>While you arrange an appointment with us on "+phone+", here are some things that genuinely help:<br><br>&#x2022; <strong>Ibuprofen</strong> works best for dental pain (reduces inflammation at source) &mdash; take 400mg with food if you can<br>&#x2022; <strong>Clove oil</strong> applied with a cotton bud can temporarily numb the area<br>&#x2022; <strong>Warm salt water rinse</strong> helps reduce bacteria and soothe gum tissue<br>&#x2022; Sleep with your head elevated to reduce throbbing<br>&#x2022; Avoid very hot, cold, or sweet triggers<br><br>Don't suffer in silence &mdash; call us and we'll see you as soon as possible.",
            "&#x1F915; <strong>Toothache: What It Might Mean</strong><br><br>Toothache has several possible causes, each needing different treatment:<br><br>&#x2022; <strong>Sharp pain on biting:</strong> Could be a cracked tooth or loose filling<br>&#x2022; <strong>Throbbing/persistent pain:</strong> May indicate infection or abscess<br>&#x2022; <strong>Sensitivity to cold/hot:</strong> Could be decay, receding gums, or grinding<br>&#x2022; <strong>Dull ache around jaw:</strong> May be grinding or sinus-related<br><br>Only a proper examination will confirm. Call "+phone+" and we'll get to the bottom of it.",
            "&#x1F915; <strong>Is Your Toothache Keeping You Up?</strong><br><br>Night-time toothache is particularly brutal. Here's what to do right now:<br><br>&#x2022; Take ibuprofen (if not contraindicated) and paracetamol together &mdash; safe to take at the same time<br>&#x2022; Rinse mouth with warm salty water<br>&#x2022; Apply clove oil or Orajel for temporary numbing<br>&#x2022; Keep head elevated (extra pillow)<br>&#x2022; Call "+phone+" as soon as we open at 9am<br><br>If swelling is developing or you feel feverish, call NHS 111 overnight."
        ]
    },

    // ════════════════════════════════════════
    // PRIORITY 8 — Greetings & social
    // ════════════════════════════════════════
    {
        id: 'greeting',
        priority: 0,
        keywords: ['hello','hi','hey','hiya','howdy','yo','sup','whats up','what\'s up','wotcha','alright','good morning','good afternoon','good evening','morning','afternoon','evening','oi','greetings','welcome','helo','helo','heya'],
        weight: 5,
        responses: [
            "Hello! Welcome to Heathway Dental. &#x1F60A; How can I help you today? I can assist with appointments, services, pricing, directions, dental advice &mdash; just ask!",
            "Hi there! I'm Heathway AI, your virtual dental assistant for The Heathway Dental Surgery in Dagenham. &#x1F9B7; What can I do for you today?",
            "Hey! Good to see you here. Whether it's booking an appointment, finding out our hours, or getting dental advice &mdash; I'm here to help. What would you like to know?",
            "Good day! Welcome to The Heathway Dental Surgery. &#x1F60A; Feel free to ask me anything about our services, prices, location, or dental health.",
            "Hiya! &#x1F44B; Thanks for reaching out to Heathway Dental. I can help with appointments, NHS charges, treatments, and more. What's on your mind?",
            "Welcome! I'm the AI assistant for The Heathway Dental Surgery in Dagenham. &#x1F9B7; Ask me anything &mdash; I know everything about our services, prices, and hours.",
            "Hi! Great to have you here. &#x1F60A; I can answer questions about booking, NHS charges, treatments, emergency care &mdash; you name it. What would you like to know?",
            "Hello and welcome to Heathway Dental's virtual assistant! &#x1F9B7; Whether you need to book, have a question, or just want dental advice &mdash; I'm all ears.",
            "Hey there! &#x1F44B; Heathway AI at your service. I can help with booking, prices, directions, dental advice and much more. Fire away!"
        ]
    },
    {
        id: 'farewell',
        priority: 0,
        keywords: ['bye','goodbye','good bye','see you','see ya','cya','take care','goodnight','gotta go','that\'s all','all done','toodles','cheerio','farewell','ta ta','byebye','bye bye','see you soon','catch you later'],
        weight: 5,
        responses: [
            "Goodbye! Take care of those teeth &mdash; brush twice, floss once, and keep smiling! &#x1F60A; Come back anytime.",
            "See you! Remember we're always here if you need us. Call "+phoneInline+" to book an appointment anytime!",
            "Bye for now! Wishing you a bright, healthy smile. &#x1F9B7; Don't forget your next check-up!",
            "Take care! And don't put off that dental check-up &mdash; your teeth will thank you! See you soon. &#x1F44B;",
            "Cheerio! &#x1F60A; Remember: a healthy mouth is a healthy you. We're here whenever you need us.",
            "Take care of yourself! &#x1F9B7; Brush twice, floss daily, and don't skip that check-up. See you soon!",
            "Bye! We're always here if you need us &mdash; call "+phoneInline+" or pop back anytime. &#x1F44B;",
            "Goodbye for now! Hope we could help. Whenever you're ready to book, call "+phoneInline+" and our friendly team will sort you out. &#x1F60A;",
            "Toodles! &#x1F9B7; Don't forget: a check-up every 6&ndash;12 months keeps the dentist at bay. See you soon!"
        ]
    },
    {
        id: 'thanks',
        priority: 0,
        keywords: ['thanks','thank you','thankyou','ta','cheers','appreciate','thx','ty','much appreciated','thank','grateful','thankful'],
        weight: 5,
        responses: [
            "You're very welcome! &#x1F60A; Is there anything else I can help with?",
            "My pleasure! Happy to help. Anything else you'd like to know about Heathway Dental?",
            "No problem at all &mdash; that's exactly what I'm here for! &#x1F9B7; Need anything else?",
            "Glad I could help! Let me know if there's anything else on your mind.",
            "Always happy to assist! &#x1F60A; Don't hesitate to ask if anything else comes up.",
            "You're so welcome! &#x1F9B7; That's exactly what I'm here for. Anything else you'd like to know?",
            "My pleasure! Is there anything else I can help with today? &#x1F60A;",
            "Happy to help! Feel free to ask if you think of anything else. &#x1F9B7;",
            "Of course &mdash; it's what I'm here for! Anything else on your mind? &#x1F60A;"
        ]
    },
    {
        id: 'small_talk',
        priority: 0,
        keywords: ['how are you','how\'re you','how r u','how you doing','you good','you ok','how do you do','what\'s good','how\'s it going','how\'s things','how are things','you alright','you okay'],
        weight: 4,
        responses: [
            "I'm doing great, thank you for asking! &#x1F60A; Always happy to chat about teeth. What can I help you with today?",
            "I'm wonderful &mdash; thanks! All systems running smoothly and ready to assist with anything dental. &#x1F9B7; How about you &mdash; what brings you to Heathway Dental today?",
            "Couldn't be better! My circuits are fully charged and my dental knowledge is primed. &#x1F916; What would you like to know?",
            "Doing brilliantly, thank you! &#x1F60A; Ready and waiting to answer all your dental questions. What can I help with?",
            "Top notch, cheers for asking! &#x1F9B7; Now then &mdash; what can I help you with today?",
            "All good this end! &#x1F916; My dental database is fully loaded and ready to assist. What's on your mind?"
        ]
    },
    {
        id: 'who_are_you',
        priority: 0,
        keywords: ['who are you','what are you','your name','are you real','are you human','are you a robot','are you a bot','are you ai','what can you do','tell me about yourself','what do you do','are you chatgpt','are you claude','heathway ai'],
        weight: 4,
        responses: [
            "&#x1F916; I'm <strong>Heathway AI</strong>, the virtual dental assistant for The Heathway Dental Surgery in Dagenham, East London.<br><br>I can help with:<br>&#x2022; Booking appointments &amp; registration<br>&#x2022; Opening hours &amp; location<br>&#x2022; NHS pricing &amp; charges<br>&#x2022; Detailed treatment information<br>&#x2022; Dental advice &amp; oral hygiene tips<br>&#x2022; Emergency guidance<br>&#x2022; Nervous patient support<br>&#x2022; Children's dentistry<br>&#x2022; And much more!<br><br>I'm not a real person, but I'm loaded with real information about our practice. For anything urgent, call "+phoneInline+".",
            "&#x1F9B7; I'm <strong>Heathway AI</strong> &mdash; think of me as your always-available dental concierge for The Heathway Dental Surgery!<br><br>I'm a virtual assistant (not a real dentist!), but I can give you detailed information about our services, prices, opening hours, and dental health topics.<br><br>Just type your question naturally &mdash; I understand plain English. Or call us on "+phoneInline+" to speak to a real person.",
            "&#x1F916; Great question! I'm the AI chatbot for <strong>The Heathway Dental Surgery</strong>, 276a Heathway, Dagenham.<br><br>I know everything about:<br>&#x2022; Our team, services &amp; treatments<br>&#x2022; NHS &amp; private pricing<br>&#x2022; Appointments &amp; registration<br>&#x2022; Oral health tips<br>&#x2022; Emergencies &amp; aftercare<br><br>I'm available 24/7 &mdash; the real team is available Mon&ndash;Fri 9am&ndash;5pm on "+phoneInline+".",
            "&#x1F9B7; I'm <strong>Heathway AI</strong> &mdash; the virtual dental assistant created for The Heathway Dental Surgery in Dagenham, Essex!<br><br>I can help with:<br>&#x2022; Booking &amp; registration<br>&#x2022; NHS bands and private pricing<br>&#x2022; Treatment information (fillings, crowns, dentures, and more)<br>&#x2022; Oral health advice<br>&#x2022; Directions and opening hours<br>&#x2022; Emergency guidance<br><br>Available 24/7. For urgent matters, always call "+phoneInline+".",
            "&#x1F916; I'm an AI assistant, not a real dentist! But I'm packed with information about <strong>The Heathway Dental Surgery</strong>.<br><br>Think of me as your always-on guide to the practice &mdash; I can answer nearly any question about our services, charges, team, and location. Just ask in plain English and I'll do my best.<br><br>For anything clinical, please always speak to the real dentist by calling "+phoneInline+"."
        ]
    },
    {
        id: 'compliment',
        priority: 0,
        keywords: ['good bot','smart','helpful','amazing','brilliant','great bot','clever','awesome','love you','well done','nice one','legend','fantastic','excellent','perfect','wonderful','impressive','thank god','best chatbot','love this'],
        weight: 3,
        responses: [
            "Aww, thank you! That honestly means a lot. &#x1F60A; Is there anything else I can help with today?",
            "You're too kind! &#x1F9B7; I'm just happy to help make your Heathway experience smooth. What else can I do for you?",
            "That's made my digital day! &#x1F916; I'm here to make your Heathway experience as easy as possible. Anything else I can assist with?",
            "&#x1F60A; You're very kind! I'm just doing my job, but it means a lot. What else can I help with?",
            "Brilliant, thank you! &#x1F9B7; It's always great to hear. Is there anything else I can assist you with today?",
            "That's so lovely to hear! &#x1F916; I'll keep doing my best. Anything else you'd like to know?"
        ]
    },
    {
        id: 'insult',
        priority: 0,
        keywords: ['stupid','dumb','useless','rubbish','terrible','hate this','worst','idiot','suck','awful','pathetic','trash','garbage','shut up','crap','bad bot','hopeless','pointless','waste of time'],
        weight: 3,
        responses: [
            "I'm sorry you feel that way! &#x1F614; I'm always trying to improve. If I misunderstood your question, please try rephrasing it and I'll do my best to help.<br><br>Or for direct assistance, call our friendly team on "+phone+".",
            "I'm sorry I haven't been helpful enough &mdash; that's frustrating and I understand. &#x1F614; Please try rewording your question, or call us directly on "+phone+" and our reception team will be glad to assist.",
            "Fair enough! &#x1F614; I don't always get things right. Please give me another chance with a rephrased question, or call "+phoneInline+" to speak to a real person straightaway.",
            "I'm sorry to hear that! &#x1F614; I genuinely want to help &mdash; please try asking your question in a different way and I'll do my best. Alternatively, call "+phoneInline+" and our reception team will assist you directly.",
            "Fair point &mdash; I'm still learning! &#x1F914; Please rephrase and I'll try again, or speak to a real human on "+phoneInline+" who can answer straight away."
        ]
    },

    // ════════════════════════════════════════
    // APPOINTMENTS & REGISTRATION
    // ════════════════════════════════════════
    {
        id: 'appointment_book',
        priority: 0,
        keywords: ['book','appointment','schedule','visit','register','sign up','new patient','first visit','how to book','make an appointment','see the dentist','get seen','come in','walkin','walk-in','drop-in','drop in','join','get registered','first appointment','new to the practice'],
        weight: 6,
        responses: [
            "&#x1F4C5; <strong>Book an Appointment</strong><br><br>To book, simply call our reception team:<br><br>&#x1F4DE; "+phone+"<br><strong>Mon&ndash;Fri: 9:00am&ndash;1:00pm &amp; 2:00pm&ndash;5:00pm</strong><br><br><strong>New patients:</strong><br>&#x2022; Both NHS and private patients are welcome<br>&#x2022; Please bring photo ID for your first visit<br>&#x2022; Allow 45&ndash;60 minutes for a new patient appointment<br>&#x2022; Bring a list of any medications you take<br><br>We don't currently accept walk-ins, but we do accommodate same-day emergencies where possible.",
            "&#x1F4C5; <strong>How to Book</strong><br><br>Call us on "+phone+" during opening hours:<br>&#x2022; Mon&ndash;Fri: 9am&ndash;1pm and 2pm&ndash;5pm<br>&#x2022; Closed 1&ndash;2pm for lunch<br>&#x2022; Weekends and bank holidays: closed<br><br>When you call, our team will:<br>&#x2022; Register you as a new patient if needed<br>&#x2022; Find a convenient appointment time<br>&#x2022; Explain what to bring and what to expect<br><br>Both NHS and private appointments available!",
            "&#x1F4C5; <strong>Ready to Book?</strong><br><br>Give us a call on "+phone+" &mdash; our friendly reception team will sort everything out for you.<br><br><strong>Useful to know:</strong><br>&#x2022; New patients are always welcome (NHS &amp; private)<br>&#x2022; For your first visit, bring photo ID and any referral letters<br>&#x2022; Emergency appointments available &mdash; just let us know when you call<br>&#x2022; Ask about our cancellation list if you need an earlier slot",
            "&#x1F4C5; <strong>Booking Is Easy</strong><br><br>Just call "+phone+" during opening hours (Mon&ndash;Fri 9am&ndash;1pm and 2pm&ndash;5pm).<br><br>Our reception team will:<br>&#x2022; Register you on the spot (new patients welcome!)<br>&#x2022; Find the next available appointment to suit you<br>&#x2022; Let you know exactly what to bring and what to expect<br>&#x2022; Note any special requirements or anxieties<br><br>Both NHS and private appointments available. Don't be shy &mdash; we look forward to hearing from you!",
            "&#x1F4C5; <strong>New Patients Welcome!</strong><br><br>Registering with us is simple &mdash; just call "+phone+" and we'll do the rest.<br><br>&#x2022; No referral needed<br>&#x2022; NHS and private patients accepted<br>&#x2022; Bring a form of ID for your first visit<br>&#x2022; Bring any relevant medical history or medication list<br>&#x2022; Expect your first appointment to take around 45&ndash;60 minutes<br><br>We look forward to welcoming you to the Heathway Dental family!",
            "&#x1F4C5; <strong>How Booking Works</strong><br><br>1. Call us on "+phone+" (Mon&ndash;Fri 9am&ndash;1pm or 2pm&ndash;5pm)<br>2. Tell us whether you're a new or existing patient<br>3. Describe what you need (routine check-up, pain, emergency, etc.)<br>4. We'll find you the next suitable slot<br>5. Show up &mdash; we'll take care of everything from there!<br><br>No online booking required &mdash; we prefer a proper chat so we can ensure the right appointment for you."
        ]
    },
    {
        id: 'appointment_cancel',
        priority: 0,
        keywords: ['cancel','cancellation','reschedule','change appointment','move appointment','rearrange','put off','postpone'],
        weight: 5,
        responses: [
            "To cancel or reschedule your appointment, please call "+phone+" as soon as possible. We really appreciate at least <strong>24 hours' notice</strong> &mdash; it allows us to offer that slot to another patient who may be waiting. Thank you for being considerate! &#x1F60A;",
            "Need to cancel or rearrange? No problem &mdash; just call "+phone+" as early as you can. We ask for at least <strong>24 hours' notice</strong> where possible. Our team will be happy to find you an alternative date.",
            "Life happens! To reschedule, call "+phone+". We just ask for <strong>24 hours' notice</strong> where possible. If it's a genuine emergency, don't worry &mdash; just let us know when you call.",
            "No problem at all! Please call us on "+phone+" as soon as you can to cancel or rearrange. <strong>24 hours' notice</strong> is always appreciated &mdash; it gives us a chance to offer your slot to a patient on the waiting list.",
            "Need to rearrange? Give us a ring on "+phone+" &mdash; the sooner the better so we can offer your time to another patient. We'll find you a new appointment that works. We always appreciate <strong>24 hours' notice</strong> where possible.",
            "Rescheduling is no trouble. Simply call "+phone+" during opening hours and we'll sort out a new time for you. Please try to give us <strong>at least 24 hours' notice</strong> so we can keep the practice running smoothly for everyone."
        ]
    },
    {
        id: 'waiting_list',
        priority: 0,
        keywords: ['waiting list','wait list','cancellation list','sooner','earlier appointment','any sooner','get seen quicker','jump the queue'],
        weight: 4,
        responses: [
            "Want to be seen sooner? Ask to be placed on our <strong>cancellation list</strong> when you call "+phone+". If a slot opens up due to a cancellation, we'll call you straight away!",
            "We have a cancellation list for patients who'd like an earlier appointment. Just mention it when you call "+phone+" and we'll add you on. We'll contact you as soon as a slot becomes available.",
            "Ask about our <strong>cancellation list</strong> when you call "+phone+". Slots do open up, and you could get seen much sooner than expected!",
            "We do have a <strong>cancellation list</strong> &mdash; just mention it when you call "+phone+" and we'll add your name. Cancellations happen more often than you'd think, so you could be seen much sooner.",
            "Want an earlier slot? Ask to go on our <strong>cancellation list</strong> when you call "+phone+". We'll ring you straight away if a suitable slot opens up, so keep your phone handy!",
            "Getting on our <strong>cancellation list</strong> is worth it &mdash; call "+phone+" and ask. We often have short-notice slots available, and patients on the list get first dibs."
        ]
    },

    // ════════════════════════════════════════
    // OPENING HOURS
    // ════════════════════════════════════════
    {
        id: 'hours',
        priority: 0,
        keywords: ['hours','opening hours','opening times','when open','when are you open','close','closed','what time','working hours','lunch','monday','tuesday','wednesday','thursday','friday','saturday','sunday','weekend','bank holiday','open today','are you open','times'],
        weight: 6,
        responses: [
            "&#x1F553; <strong>Opening Hours</strong><br><br><strong>Monday &ndash; Friday</strong><br>&#x2022; Morning: <strong>9:00am &ndash; 1:00pm</strong><br>&#x2022; Afternoon: <strong>2:00pm &ndash; 5:00pm</strong><br>&#x2022; <em>Closed 1pm&ndash;2pm for lunch</em><br><br><strong>Saturday:</strong> Closed<br><strong>Sunday:</strong> Closed<br><strong>Bank Holidays:</strong> Closed<br><br>&#x1F4DE; Call "+phoneInline+" during opening hours.",
            "&#x1F553; We're open <strong>Monday to Friday</strong>, 9am&ndash;1pm and 2pm&ndash;5pm. We close for lunch 1&ndash;2pm each day.<br><br>We're closed on weekends and bank holidays. If you have a dental emergency outside these hours, please call <strong>NHS 111</strong>.<br><br>Call us on "+phoneInline+" during opening hours to book.",
            "&#x1F553; <strong>When Can You Visit?</strong><br><br>We're open <strong>Mon&ndash;Fri</strong> 9am&ndash;1pm and 2pm&ndash;5pm (closed 1&ndash;2pm for lunch).<br><br>Closed Saturdays, Sundays, and Bank Holidays.<br><br>Outside hours? Call <strong>NHS 111</strong> for urgent dental care. Or leave a message and we'll call you back next working day.",
            "&#x1F553; <strong>Opening Hours Summary</strong><br><br>&#x2022; <strong>Monday to Friday:</strong> 9:00am &ndash; 5:00pm (with 1&ndash;2pm lunch break)<br>&#x2022; <strong>Saturday:</strong> Closed<br>&#x2022; <strong>Sunday:</strong> Closed<br>&#x2022; <strong>Bank Holidays:</strong> Closed<br><br>Best time to call: 9:00am&ndash;12:30pm when lines are quietest. For dental emergencies outside hours, call <strong>NHS 111</strong> (free, 24/7).",
            "&#x1F553; <strong>Are We Open Today?</strong><br><br>We're open <strong>Monday to Friday</strong> with a lunch break from 1pm to 2pm. On weekends and bank holidays we're closed.<br><br>&#x1F4DE; Call "+phoneInline+" during opening hours to book or speak to our team.<br><br>Outside of hours and in pain? <strong>NHS 111</strong> can direct you to the nearest urgent dental service.",
            "&#x1F553; <strong>Our Hours</strong><br><br>Mon&ndash;Fri: <strong>9am&ndash;1pm</strong> and <strong>2pm&ndash;5pm</strong><br>Lunch: Closed 1pm&ndash;2pm<br>Sat &amp; Sun: Closed<br>Bank Holidays: Closed<br><br>Pro tip: Call early in the morning for the best chance of a same-day appointment. Our number is "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // NHS PRICING
    // ════════════════════════════════════════
    {
        id: 'nhs_band1',
        priority: 0,
        keywords: ['band 1','band one','nhs band 1','27.40','£27','cheapest band','first band','check up cost','examination cost'],
        weight: 7,
        responses: [
            "&#x1F4B7; <strong>NHS Band 1 &mdash; &#163;27.40</strong><br><br>Band 1 covers:<br>&#x2022; Full examination &amp; diagnosis<br>&#x2022; Digital X-rays (if clinically needed)<br>&#x2022; Scale &amp; polish (if clinically indicated)<br>&#x2022; Preventive advice &amp; planning<br>&#x2022; Urgent same-band treatment if needed<br><br>This is the standard charge for a routine check-up. One payment covers all Band 1 care in a single course of treatment.",
            "&#x1F4B7; <strong>NHS Band 1: &#163;27.40</strong><br><br>This band covers a check-up and anything in that band during one course of treatment, including X-rays and a scale &amp; polish if the dentist thinks it's clinically necessary.<br><br>Remember: if you qualify for free NHS dental care (under 18, pregnant, certain benefits), you won't pay anything!",
            "&#x1F4B7; The cheapest NHS band is <strong>Band 1 at &#163;27.40</strong>. It covers your check-up, any X-rays needed, and a scale &amp; polish if clinically indicated.<br><br>One Band 1 charge covers everything at the same clinical level in a single course of treatment.<br><br>Need to know about higher bands? Just ask!",
            "&#x1F4B7; <strong>NHS Band 1: &#163;27.40 &mdash; Routine Care</strong><br><br>This is the most affordable NHS band and covers all you need for a routine visit:<br>&#x2022; Full mouth examination<br>&#x2022; Dental X-rays (if your dentist recommends them)<br>&#x2022; Scale and polish (when clinically needed)<br>&#x2022; Preventive advice tailored to you<br><br>Remember: children, pregnant women, and those on certain benefits pay <strong>nothing</strong>.",
            "&#x1F4B7; <strong>Band 1 &mdash; What You Get for &#163;27.40</strong><br><br>A Band 1 charge covers a complete course of care at that level:<br>&#x2022; Thorough examination by the dentist<br>&#x2022; X-rays to check for hidden problems<br>&#x2022; Oral cancer screening<br>&#x2022; Scale and polish if indicated<br>&#x2022; Home care advice<br><br>It's the best-value check-up available. Book yours: "+phoneInline+"."
        ]
    },
    {
        id: 'nhs_band2',
        priority: 0,
        keywords: ['band 2','band two','nhs band 2','75.30','£75','second band','filling cost','root canal cost','extraction cost'],
        weight: 7,
        responses: [
            "&#x1F4B7; <strong>NHS Band 2 &mdash; &#163;75.30</strong><br><br>Band 2 covers everything in Band 1, plus:<br>&#x2022; Fillings (white or amalgam)<br>&#x2022; Root canal treatment<br>&#x2022; Tooth extractions<br>&#x2022; Gum treatments<br><br>Crucially, <strong>one Band 2 charge covers all the treatment you need</strong> in the same course &mdash; so multiple fillings at the same time still only costs &#163;75.30.",
            "&#x1F4B7; <strong>NHS Band 2: &#163;75.30</strong><br><br>This covers everything from Band 1 plus more complex work: fillings, root canals, extractions, and gum treatments.<br><br>One Band 2 charge applies per course of treatment regardless of how many procedures are needed. Great value for multiple treatments!",
            "&#x1F4B7; For fillings, root canals, and extractions, the NHS charge is <strong>Band 2: &#163;75.30</strong>. This covers all such treatments needed within one course of treatment &mdash; so if you need two fillings and an extraction, you still only pay &#163;75.30.<br><br>Free if you qualify (under 18, pregnant, benefits, HC2).",
            "&#x1F4B7; <strong>NHS Band 2: &#163;75.30 &mdash; The Bread and Butter Band</strong><br><br>This covers the most common dental treatments:<br>&#x2022; One or more fillings (white or amalgam)<br>&#x2022; Root canal treatment<br>&#x2022; Tooth extractions (including wisdom teeth)<br>&#x2022; Gum treatments<br><br>One Band 2 charge covers ALL treatment at this level within the same course. Great value if you need multiple fillings.",
            "&#x1F4B7; <strong>How NHS Band 2 Works</strong><br><br>&#x2022; Cost: <strong>&#163;75.30</strong><br>&#x2022; Covers: all fillings, extractions, root canals, and gum treatments in one course<br>&#x2022; Multiple fillings = still just &#163;75.30<br>&#x2022; Also includes everything in Band 1 (check-up, X-rays, scale &amp; polish)<br><br>Free if exempt. Check your eligibility &mdash; call "+phoneInline+" or ask at reception."
        ]
    },
    {
        id: 'nhs_band3',
        priority: 0,
        keywords: ['band 3','band three','nhs band 3','326.70','£326','third band','crown cost','denture cost','bridge cost','most expensive band'],
        weight: 7,
        responses: [
            "&#x1F4B7; <strong>NHS Band 3 &mdash; &#163;326.70</strong><br><br>Band 3 covers everything in Bands 1 &amp; 2, plus:<br>&#x2022; Crowns<br>&#x2022; Dentures (full and partial)<br>&#x2022; Bridges<br><br>This includes all lab-made restorations and multiple fitting appointments &mdash; all covered by the single Band 3 charge.",
            "&#x1F4B7; <strong>NHS Band 3: &#163;326.70</strong><br><br>The highest NHS band covers crowns, bridges, and dentures &mdash; all the lab-made work. Includes all Bands 1 &amp; 2 treatment as well.<br><br>One charge covers all the treatment in one course &mdash; multiple crowns, for example, all within &#163;326.70 on the NHS.",
            "&#x1F4B7; Crowns, bridges, and dentures fall under <strong>NHS Band 3: &#163;326.70</strong>. This single payment covers all the complex restorative work you need in one course of treatment, including all lab fees and fitting appointments.<br><br>Private options are available too &mdash; call "+phoneInline+" for a quote.",
            "&#x1F4B7; <strong>Band 3: &#163;326.70 &mdash; Lab-Made Restorations</strong><br><br>Band 3 is for complex work involving a dental laboratory:<br>&#x2022; Crowns (porcelain, metal, porcelain-fused-to-metal)<br>&#x2022; Bridges (fixed tooth replacements)<br>&#x2022; Full or partial dentures<br><br>One Band 3 charge covers all these treatments within a single course &mdash; multiple crowns would still be just &#163;326.70.<br><br>Free for exempt patients.",
            "&#x1F4B7; <strong>NHS Band 3 Explained</strong><br><br>At &#163;326.70, this is the highest NHS charge, but it covers a lot:<br>&#x2022; All the treatments in Bands 1 &amp; 2<br>&#x2022; PLUS: crowns, bridges, and dentures<br>&#x2022; All lab costs and multiple fitting appointments included<br><br>Private alternatives exist for patients wanting premium materials or a more natural appearance. Call "+phoneInline+" to discuss."
        ]
    },
    {
        id: 'nhs_pricing_overview',
        priority: 0,
        keywords: ['nhs','price','cost','how much','fee','charge','band','afford','pay','payment','money','expensive','cheap','rates','tariff','nhs charges','dental charges'],
        weight: 5,
        responses: [
            "&#x1F4B7; <strong>NHS Dental Charges (2024/25)</strong><br><br><strong>Band 1 &mdash; &#163;27.40</strong><br>Check-up, X-rays, scale &amp; polish, advice<br><br><strong>Band 2 &mdash; &#163;75.30</strong><br>Everything in Band 1, plus fillings, root canal, extractions<br><br><strong>Band 3 &mdash; &#163;326.70</strong><br>Everything in Bands 1 &amp; 2, plus crowns, dentures, bridges<br><br>&#x2705; <strong>FREE for:</strong> under 18s, pregnant women, new mothers (12 months after birth), qualifying benefits, HC2 holders<br><br>We also offer private treatments with individual pricing. Call "+phoneInline+" for a quote.",
            "&#x1F4B7; <strong>Our NHS Price Bands</strong><br><br>&#x2022; <strong>Band 1:</strong> &#163;27.40 &mdash; Check-up, X-rays, scale &amp; polish<br>&#x2022; <strong>Band 2:</strong> &#163;75.30 &mdash; Fillings, extractions, root canal<br>&#x2022; <strong>Band 3:</strong> &#163;326.70 &mdash; Crowns, bridges, dentures<br><br>One band charge covers all treatment at that level in one course. Some patients are entitled to <strong>free treatment</strong> &mdash; see exemptions. Ask about private options too.",
            "&#x1F4B7; NHS dental treatment is charged in three bands:<br><br>&#x2022; <strong>&#163;27.40</strong> &mdash; Routine check-up (Band 1)<br>&#x2022; <strong>&#163;75.30</strong> &mdash; Fillings, extractions, root canals (Band 2)<br>&#x2022; <strong>&#163;326.70</strong> &mdash; Crowns, bridges, dentures (Band 3)<br><br>Under 18? Pregnant? On benefits? You could get treatment for <strong>free</strong>. Ask us when you call "+phoneInline+".",
            "&#x1F4B7; <strong>NHS Pricing at a Glance</strong><br><br>The NHS sets a fixed three-band charge for all dental practices:<br><br>&#x2022; <strong>Band 1 &mdash; &#163;27.40:</strong> Check-up, X-rays, cleaning<br>&#x2022; <strong>Band 2 &mdash; &#163;75.30:</strong> Fillings, extractions, root canal<br>&#x2022; <strong>Band 3 &mdash; &#163;326.70:</strong> Crowns, bridges, dentures<br><br>Each band is a fixed charge covering all treatment at that level in one course. No surprise bills! Call "+phoneInline+" to book.",
            "&#x1F4B7; <strong>Understanding NHS Dental Charges</strong><br><br>Good news: NHS dental charges are capped and transparent.<br><br>&#x2022; You pay <strong>one band charge</strong> per course of treatment<br>&#x2022; A &lsquo;course of treatment&rsquo; covers everything needed for one problem<br>&#x2022; The most complex treatment needed determines the band<br>&#x2022; Some patients pay <strong>nothing</strong> (children, pregnant women, benefits recipients)<br><br>Not sure which band applies to you? Call "+phoneInline+" and we'll advise."
        ]
    },
    {
        id: 'nhs_free',
        priority: 0,
        keywords: ['free dental','exempt','exemption','hc2','hc3','maternity exemption','free nhs','who gets free','qualify for free','free treatment','no charge','dont pay','don\'t have to pay','free check','free dentist'],
        weight: 6,
        responses: [
            "&#x2705; <strong>Free NHS Dental Care</strong><br><br>You may be entitled to completely free NHS treatment if you are:<br>&#x2022; <strong>Under 18</strong> (or under 19 in full-time education)<br>&#x2022; <strong>Pregnant</strong> or had a baby in the <strong>last 12 months</strong><br>&#x2022; Receiving <strong>Universal Credit</strong>, Income Support, income-related JSA, income-related ESA, or Pension Credit (Guarantee Credit)<br>&#x2022; Named on an <strong>NHS HC2 certificate</strong> (full exemption)<br>&#x2022; An NHS hospital inpatient<br>&#x2022; A war pension holder (for relevant treatment)<br><br>Please bring <strong>proof of exemption</strong> to your appointment. Ask reception if you're unsure!",
            "&#x2705; <strong>Who Qualifies for Free NHS Dentistry?</strong><br><br>&#x2022; Children under 18 (or 19 in full-time education)<br>&#x2022; Pregnant women &amp; new mothers up to 12 months after birth<br>&#x2022; People on qualifying benefits (Universal Credit, JSA, ESA, Pension Credit, Income Support)<br>&#x2022; NHS Low Income Scheme &mdash; HC2 certificate (full), HC3 (partial)<br><br>If you're on a low income but not on benefits, you may still qualify through the <a href='https://www.nhsbsa.nhs.uk/exemptions' target='_blank' style='color:var(--teal)'>NHS Low Income Scheme</a>. Call "+phoneInline+" and we'll advise you.",
            "&#x2705; Several groups receive <strong>free NHS dental treatment</strong>:<br><br>&#x2022; Under-18s (and under-19s in full-time education)<br>&#x2022; Pregnant women and those who gave birth in the last 12 months (get a MatEx certificate from your midwife)<br>&#x2022; Benefits claimants (Universal Credit, JSA, ESA, etc.)<br>&#x2022; HC2 certificate holders<br><br>Not sure if you qualify? Call us on "+phoneInline+" and we'll help you work it out!",
            "&#x2705; <strong>Do You Qualify for Free NHS Dental Care?</strong><br><br>Check this list &mdash; you might be surprised:<br><br>&#x2022; <strong>Age under 18</strong> (or under 19 in full-time education)<br>&#x2022; <strong>Pregnant</strong> &mdash; get your Maternity Exemption (MatEx) from your midwife<br>&#x2022; <strong>Had a baby</strong> in the last 12 months<br>&#x2022; On <strong>Universal Credit, Income Support, JSA (income-related), or Pension Credit</strong><br>&#x2022; On <strong>NHS Low Income Scheme</strong> with HC2 certificate<br><br>Bring your exemption proof to the appointment. If unsure, call "+phoneInline+".",
            "&#x2705; <strong>NHS Dental Exemptions</strong><br><br>You are automatically entitled to free NHS dental care if you're:<br><br>&#x2022; Under 18 (or 19 and in full-time education)<br>&#x2022; Pregnant (apply for MatEx certificate from your midwife or GP)<br>&#x2022; A new mother within 12 months of giving birth<br>&#x2022; Receiving Universal Credit, Income Support, income-related Employment and Support Allowance, or Pension Credit<br>&#x2022; An NHS hospital inpatient receiving treatment<br><br>Low income but not on benefits? You may still qualify &mdash; check the NHS Low Income Scheme (HC1 form). Ask at reception!"
        ]
    },
    {
        id: 'payment_options',
        priority: 0,
        keywords: ['private','payment plan','finance','instalment','spread the cost','card','cash','accept payment','pay how','payment options','payment methods','credit card','debit card','direct debit','how to pay'],
        weight: 5,
        responses: [
            "&#x1F4B3; <strong>Payment Options</strong><br><br>&#x2022; <strong>NHS treatments:</strong> Standard band charges (Band 1: &#163;27.40, Band 2: &#163;75.30, Band 3: &#163;326.70)<br>&#x2022; <strong>Private treatments:</strong> Priced individually at your consultation<br>&#x2022; We accept <strong>cash</strong> and <strong>debit / credit cards</strong><br>&#x2022; <strong>Payment plans</strong> available for larger private treatments &mdash; ask at reception<br><br>Call "+phoneInline+" for pricing queries on specific private treatments.",
            "&#x1F4B3; We accept <strong>cash and all major debit/credit cards</strong>. NHS charges are fixed (Band 1&ndash;3). For private treatments, we can provide a full quote at your consultation.<br><br>For larger private treatments, we can discuss <strong>flexible payment plans</strong> to spread the cost. Call "+phoneInline+" to find out more.",
            "&#x1F4B3; <strong>How to Pay</strong><br><br>&#x2022; Cash or card accepted (all major debit/credit cards)<br>&#x2022; NHS charges are the same everywhere (set by the government)<br>&#x2022; Private treatment costs vary &mdash; we provide detailed quotes<br>&#x2022; Payment plans available for larger private work<br><br>No hidden fees. No surprises. We explain all costs before any treatment begins.",
            "&#x1F4B3; <strong>NHS vs Private Costs</strong><br><br><strong>NHS:</strong> Fixed government charges &mdash; Band 1 &#163;27.40, Band 2 &#163;75.30, Band 3 &#163;326.70. The same at every NHS practice in England.<br><br><strong>Private:</strong> Priced individually per treatment. You'll receive a written treatment plan and cost breakdown before any work begins.<br><br>We accept cash and all major debit/credit cards. Call "+phoneInline+" for a private quote.",
            "&#x1F4B3; <strong>Transparent Pricing Policy</strong><br><br>We believe in complete transparency:<br><br>&#x2022; All NHS charges are fixed &mdash; no discretion on our part<br>&#x2022; Private treatment costs given in advance in writing<br>&#x2022; No hidden charges or surprise bills<br>&#x2022; NHS charge confirmed before any treatment starts<br>&#x2022; Payment on the day via cash or card<br><br>Questions about cost? Just ask &mdash; call "+phoneInline+" anytime during opening hours."
        ]
    },

    // ════════════════════════════════════════
    // LOCATION & TRANSPORT
    // ════════════════════════════════════════
    {
        id: 'location',
        priority: 0,
        keywords: ['location','address','where are you','directions','find you','map','postcode','post code','get there','parking','station','bus','tube','underground','near','how to get','satnav','sat nav','dagenham','heathway','rm10','transport','travel'],
        weight: 6,
        responses: [
            "&#x1F4CD; <strong>Our Location</strong><br><br><strong>The Heathway Dental Surgery</strong><br>276a Heathway, Dagenham<br>Essex, RM10 8QS<br><br>&#x1F687; <strong>Tube:</strong> Dagenham Heathway station (District Line) &mdash; just a <strong>3-minute walk</strong><br>&#x1F68C; <strong>Bus:</strong> Routes <strong>173, 174, 175</strong> stop nearby on Heathway<br>&#x1F697; <strong>Parking:</strong> Street parking available along Heathway<br>&#x1F697; <strong>Driving:</strong> Nearest postcode: RM10 8QS (use Google Maps for directions)<br><br><a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>Open in Google Maps &#x2197;</a>",
            "&#x1F4CD; We're at <strong>276a Heathway, Dagenham, Essex, RM10 8QS</strong>.<br><br><strong>Getting here:</strong><br>&#x2022; <strong>Tube:</strong> Dagenham Heathway (District Line) &mdash; 3 min walk<br>&#x2022; <strong>Bus:</strong> 173, 174, or 175 along Heathway<br>&#x2022; <strong>Car:</strong> Street parking on Heathway &mdash; check signs for restrictions<br><br><a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>Open Google Maps &#x2197;</a>",
            "&#x1F4CD; <strong>Address:</strong> 276a Heathway, Dagenham, Essex, RM10 8QS<br><br><strong>Transport links:</strong><br>&#x2022; Dagenham Heathway tube station (District Line) is 3 minutes on foot<br>&#x2022; Buses 173, 174, 175 stop right on Heathway<br>&#x2022; Street parking available (check signs)<br><br><a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>View on Google Maps &#x2197;</a>",
            "&#x1F4CD; <strong>Finding Us</strong><br><br>We're easy to find in Dagenham:<br><br><strong>The Heathway Dental Surgery</strong><br>276a Heathway, Dagenham, Essex, RM10 8QS<br><br>&#x1F687; <strong>By Tube:</strong> Dagenham Heathway (District Line) &mdash; we're literally a 3-minute walk away<br>&#x1F68C; <strong>By Bus:</strong> Routes 173, 174, 175 all stop on Heathway<br>&#x1F697; <strong>By Car:</strong> Use postcode RM10 8QS &mdash; street parking available on Heathway (check signs for restrictions)<br><br><a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>Open Google Maps &#x2197;</a>",
            "&#x1F4CD; <strong>How to Get to Heathway Dental</strong><br><br>We're right on the high street in Dagenham, extremely well connected:<br><br>&#x2022; <strong>Nearest tube:</strong> Dagenham Heathway &mdash; District Line, 3 min walk<br>&#x2022; <strong>Nearest buses:</strong> 173, 174, 175 along Heathway<br>&#x2022; <strong>Driving:</strong> Postcode RM10 8QS for sat-nav<br>&#x2022; <strong>Parking:</strong> Street parking on Heathway and nearby side streets<br><br>Can't find us? Call "+phoneInline+" and we'll guide you in!",
            "&#x1F4CD; <strong>Dagenham Dental Practice</strong><br><br>We're located at <strong>276a Heathway, Dagenham, Essex RM10 8QS</strong> &mdash; right on the main Heathway road.<br><br>&#x2022; Just 3 minutes from Dagenham Heathway tube (District Line)<br>&#x2022; Bus stops directly outside (routes 173, 174, 175)<br>&#x2022; Street parking nearby<br>&#x2022; Easy to spot &mdash; look for the dental surgery signage<br><br>We're one of the most accessible practices in East London. <a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>Google Maps &#x2197;</a>"
        ]
    },

    // ════════════════════════════════════════
    // TREATMENTS — Dentures
    // ════════════════════════════════════════
    {
        id: 'dentures',
        priority: 0,
        keywords: ['denture','dentures','false teeth','missing teeth','no teeth','lost teeth','replace teeth','replacement teeth','partial denture','full denture','teeth replacement'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Dentures</strong><br><br>We provide comfortable, natural-looking dentures to replace missing teeth:<br><br>&#x2022; <strong>Full dentures:</strong> Replace all teeth in upper or lower jaw<br>&#x2022; <strong>Partial dentures:</strong> Fill gaps while keeping your natural teeth<br>&#x2022; <strong>NHS Band 3:</strong> &#163;326.70 covers dentures on the NHS<br>&#x2022; <strong>Private options:</strong> Premium materials for a more natural look<br>&#x2022; Adjustments and repairs available<br><br>Call "+phoneInline+" to book a consultation.",
            "&#x1F9B7; <strong>Dentures at Heathway Dental</strong><br><br>Missing teeth? Dentures can restore your smile and help you eat comfortably again.<br><br>&#x2022; Full and partial dentures available<br>&#x2022; Available on the NHS (Band 3: &#163;326.70)<br>&#x2022; Private dentures with premium materials also offered<br>&#x2022; We provide adjustments, relines, and repairs<br><br>Book a denture consultation: "+phoneInline,
            "&#x1F9B7; <strong>Replace Missing Teeth</strong><br><br>Don't let missing teeth hold you back. Our denture options include:<br><br>&#x2022; Full dentures for complete tooth loss<br>&#x2022; Partial dentures to fill gaps<br>&#x2022; NHS and private options available<br>&#x2022; Ongoing adjustments to ensure comfort<br><br>Call "+phoneInline+" to discuss which option suits you best.",
            "&#x1F9B7; <strong>Dentures &mdash; Frequently Asked Questions</strong><br><br><strong>How long do they take to make?</strong> Usually 4&ndash;6 weeks, with several fitting appointments.<br><strong>Will they hurt?</strong> Some initial soreness is normal &mdash; we adjust them until comfortable.<br><strong>Can I eat normally?</strong> Yes, with practice! Start with soft foods.<br><strong>How do I clean them?</strong> Remove nightly, brush with a soft brush, soak in Steradent.<br><br>Call "+phoneInline+" for a denture consultation.",
            "&#x1F9B7; <strong>NHS or Private Dentures?</strong><br><br>Both options are available at Heathway Dental:<br><br>&#x2022; <strong>NHS dentures (Band 3: &#163;326.70):</strong> Good quality acrylic dentures, functional and well-fitting<br>&#x2022; <strong>Private dentures:</strong> Premium materials (valplast, metal-reinforced), more natural appearance, better fit<br><br>We'll advise which is right for your situation. Call "+phoneInline+" for a consultation."
        ]
    },
    {
        id: 'whitening',
        priority: 0,
        keywords: ['whitening','whiten','whiter teeth','bleach teeth','teeth whitening','bright teeth','brighter smile','white smile','tray whitening','laser whitening','home whitening','teeth bleach'],
        weight: 6,
        responses: [
            "We don't currently offer teeth whitening at Heathway Dental. We focus on NHS general and restorative dentistry.<br><br>We can help with: check-ups, fillings, root canal treatment, crowns, bridges, dentures, extractions, and gum disease treatment.<br><br>Call "+phoneInline+" for any of these treatments.",
            "Teeth whitening isn't something we offer at Heathway Dental &mdash; we're focused on providing high-quality NHS and private restorative dentistry.<br><br>For a brighter smile, a professional scale &amp; polish can significantly improve the appearance of your teeth by removing surface stains from tea, coffee, and other foods.<br><br>Book a hygiene appointment: "+phoneInline+".",
            "We specialise in restorative and preventive dentistry rather than cosmetic whitening. However, a thorough professional scale and polish (included in NHS Band 1) can make a real difference to tooth colour by removing surface staining.<br><br>For anything else dental-related, call "+phoneInline+" and we'll help."
        ]
    },
    {
        id: 'veneers',
        priority: 0,
        keywords: ['veneer','veneers','porcelain veneer','composite veneer','dental veneer','tooth veneer','bonding','dental bonding','tooth bonding'],
        weight: 6,
        responses: [
            "We don't currently offer veneers or cosmetic bonding at Heathway Dental.<br><br>For damaged or discoloured teeth, we do offer <strong>crowns</strong> and <strong>bridges</strong> which can restore both function and appearance. These are available on the NHS (Band 3: &#163;326.70).<br><br>Call "+phoneInline+" to discuss your options.",
            "Veneers aren't currently available at our practice &mdash; we specialise in general and restorative dentistry rather than purely cosmetic work.<br><br>If you have a damaged or severely discoloured tooth, a <strong>dental crown</strong> can restore both its appearance and function. Available on NHS (Band 3: &#163;326.70). Call "+phoneInline+" to find out more.",
            "We focus on restorative dentistry rather than cosmetic veneers. That said, <strong>crowns</strong> can achieve a significant improvement in the appearance of damaged, cracked, or heavily discoloured teeth &mdash; while also protecting the tooth structurally.<br><br>NHS Band 3 (&#163;326.70) covers crowns. Private options also available. Call "+phoneInline+"."
        ]
    },
    {
        id: 'cosmetic_enquiry',
        priority: 0,
        keywords: ['smile makeover','improve my smile','better teeth','hate my teeth','embarrassed about teeth','cosmetic dentistry','cosmetic treatment','want a new smile','transform smile','smile design','dream smile','confident smile'],
        weight: 5,
        responses: [
            "We're an <strong>NHS general and restorative dental practice</strong> &mdash; we don't offer cosmetic treatments like whitening or veneers.<br><br>However, we can still help improve your smile with the treatments we do offer:<br><br>&#x2022; <strong>Crowns</strong> &mdash; rebuild and reshape damaged teeth<br>&#x2022; <strong>Bridges</strong> &mdash; replace missing teeth<br>&#x2022; <strong>Dentures</strong> &mdash; full or partial tooth replacement<br>&#x2022; <strong>Fillings</strong> &mdash; repair decay<br>&#x2022; <strong>Scale &amp; polish</strong> &mdash; professional cleaning<br><br>Call "+phoneInline+" to book a check-up and we'll advise on how we can help.",
            "We're primarily an NHS restorative practice rather than a cosmetic clinic. We don't offer whitening, veneers, or smile makeovers.<br><br>However, a good check-up, professional clean, and well-fitting restorations can make a real, visible difference to how your smile looks and feels. Call "+phoneInline+" to start.",
            "While cosmetic dentistry isn't our focus, we genuinely believe a healthy, well-maintained smile is beautiful in its own right.<br><br>We offer:<br>&#x2022; Scale and polish &mdash; removes staining, freshens appearance<br>&#x2022; White fillings &mdash; invisible repairs<br>&#x2022; Crowns &mdash; reshape and protect damaged teeth<br>&#x2022; Dentures &mdash; natural-looking replacement teeth<br><br>Book a check-up: "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // TREATMENTS — Restorative
    // ════════════════════════════════════════
    {
        id: 'fillings',
        priority: 0,
        keywords: ['filling','fillings','amalgam','composite','white filling','silver filling','tooth filled','fill a tooth','cavity filling','need a filling'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Dental Fillings</strong><br><br>We offer both NHS and private filling options:<br><br>&#x2022; <strong>Composite (white/tooth-coloured):</strong> Virtually invisible, bonds directly to tooth<br>&#x2022; <strong>Amalgam (silver):</strong> Highly durable, cost-effective &mdash; NHS standard option<br><br>Most fillings are completed in a single visit under local anaesthetic &mdash; completely pain-free. Covered by <strong>NHS Band 2: &#163;75.30</strong>.",
            "&#x1F9B7; <strong>Fillings</strong><br><br>A filling repairs a cavity and stops further decay:<br><br>&#x2022; White composite fillings blend seamlessly with your tooth<br>&#x2022; Amalgam fillings are very durable for back teeth<br>&#x2022; Treatment is quick, painless with local anaesthetic<br>&#x2022; NHS Band 2 (&#163;75.30) covers fillings &mdash; one charge covers multiple fillings in the same course<br><br>Book now: "+phoneInline,
            "&#x1F9B7; <strong>Do You Need a Filling?</strong><br><br>Signs you might: sensitivity, toothache, visible hole, rough edge. We can confirm at a check-up.<br><br>&#x2022; Local anaesthetic ensures no pain during treatment<br>&#x2022; White (composite) or silver (amalgam) options<br>&#x2022; Most done in 30&ndash;45 minutes<br>&#x2022; NHS: &#163;75.30 (Band 2)<br><br>Don't leave cavities &mdash; they only get bigger. Book: "+phoneInline,
            "&#x1F9B7; <strong>White vs Silver Fillings</strong><br><br>Not sure which to choose? Here's the breakdown:<br><br><strong>White (composite) fillings:</strong><br>&#x2022; Tooth-coloured, virtually invisible<br>&#x2022; Bonds directly to tooth &mdash; less drilling needed<br>&#x2022; Available on NHS and privately<br><br><strong>Silver (amalgam) fillings:</strong><br>&#x2022; Extremely durable &mdash; best for heavily loaded back teeth<br>&#x2022; NHS standard option for most back teeth<br><br>Both are safe and effective. Your dentist will advise at the appointment. Call "+phoneInline+" to book.",
            "&#x1F9B7; <strong>Worried About Getting a Filling?</strong><br><br>Fillings have a terrible reputation &mdash; completely undeserved with modern dentistry!<br><br>&#x2022; Numbing gel applied first so you don't feel the injection<br>&#x2022; You'll feel pressure and vibration but <strong>no pain</strong><br>&#x2022; Most fillings take just 20&ndash;40 minutes<br>&#x2022; You can drive home immediately and eat later that day<br>&#x2022; NHS: &#163;75.30 covers all fillings in one course<br><br>Don't put it off &mdash; the longer a cavity is left, the bigger and more expensive the treatment. Call "+phoneInline+"."
        ]
    },
    {
        id: 'crowns',
        priority: 0,
        keywords: ['crown','crowns','dental crown','tooth cap','porcelain crown','need a crown','cracked tooth crown','crown after root canal'],
        weight: 6,
        responses: [
            "&#x1F451; <strong>Dental Crowns</strong><br><br>A crown (cap) fits over a damaged tooth, restoring its shape, strength, and appearance.<br><br>&#x2022; Made from porcelain for a completely natural look<br>&#x2022; Protects weakened, cracked, or root-treated teeth<br>&#x2022; Usually takes 2 appointments (preparation + fitting)<br>&#x2022; Can last <strong>15+ years</strong> with good care<br>&#x2022; NHS: <strong>Band 3 (&#163;326.70)</strong> | Private options available<br><br>Call "+phoneInline+" to book a crown assessment.",
            "&#x1F451; <strong>What Is a Dental Crown?</strong><br><br>A crown completely covers a tooth, giving it back its shape and protecting it from further damage.<br><br>When you might need one:<br>&#x2022; After root canal treatment<br>&#x2022; Large fillings that weaken the tooth<br>&#x2022; Cracked or broken teeth<br>&#x2022; Heavily worn teeth<br><br>NHS: &#163;326.70 (Band 3). Private ceramic options available. Call "+phoneInline+".",
            "&#x1F451; <strong>Dental Crowns</strong><br><br>Crowns are one of the most reliable ways to save and protect a damaged tooth.<br><br>&#x2022; Natural-looking porcelain crowns<br>&#x2022; 2 visits &mdash; temporary crown on day 1, permanent on day 2<br>&#x2022; Extremely durable &mdash; 15+ years typical lifespan<br>&#x2022; NHS Band 3: &#163;326.70<br><br>Ask us about the difference between NHS and private crowns at your consultation.",
            "&#x1F451; <strong>How Is a Dental Crown Fitted?</strong><br><br>The process is straightforward and carried out under local anaesthetic:<br><br>1. <strong>Appointment 1:</strong> Tooth prepared (trimmed slightly), impressions taken, temporary crown fitted<br>2. <strong>Wait:</strong> Crown made in a laboratory (1&ndash;2 weeks)<br>3. <strong>Appointment 2:</strong> Temporary removed, permanent crown cemented in place<br><br>&#x2022; Completely pain-free under anaesthetic<br>&#x2022; Looks and functions exactly like a natural tooth<br>&#x2022; NHS: &#163;326.70 | Private: better materials available<br><br>Book: "+phoneInline,
            "&#x1F451; <strong>Crown vs Filling &mdash; What's the Difference?</strong><br><br>&#x2022; A <strong>filling</strong> repairs part of a tooth &mdash; good when most of the tooth structure is intact<br>&#x2022; A <strong>crown</strong> covers the entire tooth &mdash; used when the tooth is too damaged for a filling to hold<br><br>Your dentist will always recommend the most conservative option. If a crown is suggested, it's because it's genuinely the best long-term solution.<br><br>Call "+phoneInline+" to discuss."
        ]
    },
    {
        id: 'bridges',
        priority: 0,
        keywords: ['bridge','bridges','dental bridge','tooth bridge','replace missing tooth','fixed replacement','gap in teeth'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Dental Bridges</strong><br><br>A bridge replaces one or more missing teeth by anchoring to adjacent teeth.<br><br>&#x2022; Fixed in place &mdash; no removing like dentures<br>&#x2022; Looks and functions like natural teeth<br>&#x2022; Restores your smile, bite, and speech<br>&#x2022; Usually 2&ndash;3 visits<br>&#x2022; NHS Band 3 (&#163;326.70) or private options<br><br>Book a consultation: "+phoneInline,
            "&#x1F9B7; <strong>Bridges</strong><br><br>If you're missing one or more teeth, a bridge could be the perfect solution:<br><br>&#x2022; Permanently fixed &mdash; feels and looks natural<br>&#x2022; Adjacent teeth are crowned to support the bridge<br>&#x2022; Prevents remaining teeth from shifting<br>&#x2022; NHS Band 3 or private<br><br>We'll advise whether a bridge or denture is best for you. Call "+phoneInline+".",
            "&#x1F9B7; <strong>What Is a Dental Bridge?</strong><br><br>A bridge 'bridges' the gap left by missing teeth, supported by crowns on neighbouring teeth.<br><br>&#x2022; No gaps in your smile<br>&#x2022; Fixed &mdash; not removable<br>&#x2022; 2&ndash;3 appointments to complete<br>&#x2022; NHS or private &mdash; we'll explain the options<br><br>Call "+phoneInline+" to find out if a bridge is right for you.",
            "&#x1F9B7; <strong>Bridge vs Denture &mdash; Which Is Better?</strong><br><br>Both replace missing teeth, but in different ways:<br><br><strong>Bridge:</strong> Fixed permanently, feels like natural teeth, requires crowning adjacent teeth<br><strong>Denture:</strong> Removable, no surgery required, adjustable, often more affordable<br><br>The right choice depends on how many teeth are missing, the health of adjacent teeth, and your preferences. Our dentist will advise at your consultation. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Dental Bridge Process</strong><br><br>Getting a bridge takes 2&ndash;3 appointments:<br><br>1. <strong>Assessment:</strong> Check adjacent teeth are strong enough to support the bridge<br>2. <strong>Preparation:</strong> Adjacent teeth crowned, impressions taken, temporary bridge fitted<br>3. <strong>Fitting:</strong> Permanent bridge cemented in place, bite checked and adjusted<br><br>&#x2022; NHS Band 3: &#163;326.70<br>&#x2022; Lasts 10&ndash;15 years with good care<br><br>Call "+phoneInline+" for an assessment."
        ]
    },
    {
        id: 'dentures',
        priority: 0,
        keywords: ['denture','dentures','false teeth','full denture','partial denture','denture fitting','new dentures','ill-fitting dentures','denture repair'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Dentures</strong><br><br>Modern dentures are more comfortable and natural-looking than ever:<br><br>&#x2022; <strong>Full dentures:</strong> Replace all teeth in upper or lower jaw<br>&#x2022; <strong>Partial dentures:</strong> Fill gaps between remaining natural teeth<br>&#x2022; Custom-made from impressions of your mouth<br>&#x2022; Takes a few appointments to get the perfect fit<br>&#x2022; NHS Band 3 (&#163;326.70) or private options<br><br>Call "+phoneInline+" to discuss.",
            "&#x1F9B7; <strong>Dental Dentures</strong><br><br>Whether you need full or partial dentures, we make them comfortable and natural-looking:<br><br>&#x2022; Custom impressions for a precise fit<br>&#x2022; Multiple try-in appointments to get it right<br>&#x2022; Can be adjusted over time as your mouth changes<br>&#x2022; NHS: &#163;326.70 | Private options: better materials, more natural appearance<br><br>Call "+phoneInline+" and we'll guide you through the process.",
            "&#x1F9B7; <strong>Considering Dentures?</strong><br><br>We understand this can feel like a big step. Our team will make the process as comfortable as possible:<br><br>&#x2022; Realistic-looking, well-fitting modern dentures<br>&#x2022; Full and partial styles available<br>&#x2022; Adjustments and relines for ongoing comfort<br>&#x2022; NHS: &#163;326.70 per course of treatment<br><br>Call "+phoneInline+" to arrange a denture consultation.",
            "&#x1F9B7; <strong>Ill-Fitting Dentures?</strong><br><br>Dentures that slip, rub, or cause sore spots need attention &mdash; don't put up with discomfort:<br><br>&#x2022; Relining adjusts the fitting surface for a snug fit<br>&#x2022; Full replacement may be needed if the denture is old or warped<br>&#x2022; Minor repairs (cracks, broken teeth) can often be done quickly<br>&#x2022; As bone and gum tissue change over time, dentures need periodic adjustment<br><br>Call "+phoneInline+" and we'll have a look.",
            "&#x1F9B7; <strong>Denture Fitting Process</strong><br><br>Getting a new denture usually takes 4&ndash;5 appointments:<br><br>1. <strong>Assessment:</strong> Impressions of your mouth<br>2. <strong>Jaw registration:</strong> Recording how your jaws bite together<br>3. <strong>Wax try-in:</strong> You see the denture before it's finalised<br>4. <strong>Fitting:</strong> Finished denture fitted and adjusted<br>5. <strong>Review:</strong> Fine-tuning for comfort<br><br>NHS: &#163;326.70. We take time to get it right. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Full vs Partial Dentures</strong><br><br>Not sure which you need?<br><br><strong>Full denture:</strong> All teeth on one or both arches replaced. Rests on the gum and relies on suction and adhesive.<br><br><strong>Partial denture:</strong> Fills gaps between remaining natural teeth. Clasps onto existing teeth for stability.<br><br>Both are available on NHS (&#163;326.70 Band 3) or as higher-quality private options. Call "+phoneInline+" for a consultation.",
            "&#x1F9B7; <strong>Denture Aftercare &amp; Maintenance</strong><br><br>Looking after your denture extends its life and protects your gum health:<br><br>&#x2022; Remove and rinse after every meal<br>&#x2022; Brush with a soft denture brush and mild soap (not toothpaste &mdash; too abrasive)<br>&#x2022; Soak overnight in denture solution<br>&#x2022; Don't drop &mdash; fill the sink with water when handling<br>&#x2022; Bring to every dental check-up for inspection<br><br>Regular check-ups still matter even without natural teeth! Call "+phoneInline+".",
            "&#x1F9B7; <strong>New to Dentures?</strong><br><br>It takes time to get used to wearing dentures &mdash; that's completely normal:<br><br>&#x2022; Eating and speaking may feel different for the first few weeks<br>&#x2022; Start with soft foods and build up<br>&#x2022; Practice speaking aloud at home<br>&#x2022; Mild soreness initially is normal &mdash; call us if it persists<br>&#x2022; Denture adhesive can help in the early stages<br><br>Most people adapt within 4&ndash;8 weeks. We're here to support you. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Dentures &mdash; NHS vs Private</strong><br><br>Both options are available at Heathway Dental:<br><br><strong>NHS dentures (&#163;326.70):</strong> Fully functional, good quality, standard acrylic<br><strong>Private dentures:</strong> Better materials (flexible resin, cobalt-chrome metal base), thinner and lighter, more natural appearance<br><br>Your dentist will help you choose based on your needs and budget. Call "+phoneInline+" for a consultation."
        ]
    },
    {
        id: 'implants',
        priority: 0,
        keywords: ['implant','implants','dental implant','tooth implant','permanent tooth','titanium implant','implant crown'],
        weight: 6,
        responses: [
            "We don't currently offer dental implants at Heathway Dental.<br><br>For replacing missing teeth, we do offer:<br><br>&#x2022; <strong>Bridges</strong> &mdash; fixed replacements anchored to adjacent teeth<br>&#x2022; <strong>Dentures</strong> &mdash; full or partial, NHS or private<br><br>Both are available on NHS Band 3 (&#163;326.70). Call "+phoneInline+" to discuss the best option for you.",
            "Dental implants aren't available at our practice, but there are excellent alternatives:<br><br>&#x2022; <strong>Dental bridges</strong> &mdash; fixed, permanent, and anchored to adjacent teeth. Very natural-looking.<br>&#x2022; <strong>Partial dentures</strong> &mdash; removable, cost-effective, and available on the NHS<br>&#x2022; <strong>Full dentures</strong> &mdash; if multiple teeth are missing<br><br>We'll advise which suits you best at a consultation. Call "+phoneInline+".",
            "We focus on NHS general and restorative dentistry rather than implant work. However, we can help you with the next best options:<br><br>&#x2022; <strong>Bridge</strong> &mdash; covers the gap with a fixed crown supported by neighbouring teeth (Band 3: &#163;326.70)<br>&#x2022; <strong>Denture</strong> &mdash; removable, custom-fitted replacement (Band 3: &#163;326.70)<br><br>Both are long-lasting and functional. Call "+phoneInline+" to discuss what's right for you."
        ]
    },
    {
        id: 'root_canal',
        priority: 0,
        keywords: ['root canal','endodontic','root treatment','infected tooth','nerve removed','root filling','tooth nerve','pulp','pulpitis'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Root Canal Treatment</strong><br><br>Root canal saves an infected or damaged tooth instead of extracting it:<br><br>&#x2022; Removes infected pulp (nerve tissue) from inside the tooth<br>&#x2022; Modern techniques make it <strong>no more uncomfortable than a filling</strong><br>&#x2022; Usually 1&ndash;2 visits<br>&#x2022; NHS Band 2 (&#163;75.30)<br>&#x2022; Tooth is usually crowned afterwards for long-term protection<br><br>Don't delay &mdash; early treatment prevents complications! Call "+phoneInline+".",
            "&#x1F9B7; <strong>Root Canal &mdash; Don't Be Afraid!</strong><br><br>Root canal has a bad reputation, but modern dentistry has changed that:<br><br>&#x2022; Carried out under local anaesthetic &mdash; you won't feel the treatment<br>&#x2022; Saves your natural tooth (better long-term than extraction)<br>&#x2022; Stops the infection spreading<br>&#x2022; NHS: &#163;75.30 (Band 2)<br>&#x2022; Quick recovery &mdash; back to normal in a day or two<br><br>Call "+phoneInline+" if you think you might need one.",
            "&#x1F9B7; <strong>What Is Root Canal?</strong><br><br>When the nerve inside a tooth gets infected, root canal removes the infection and seals the tooth.<br><br>&#x2022; Step 1: Local anaesthetic (completely numbs the area)<br>&#x2022; Step 2: Infected pulp removed through tiny access hole<br>&#x2022; Step 3: Canals cleaned, shaped, and filled with gutta-percha<br>&#x2022; Step 4: Tooth crowned to protect it<br><br>NHS: &#163;75.30. The alternative (extraction) often costs more in the long run. Don't wait &mdash; call "+phoneInline+".",
            "&#x1F9B7; <strong>Signs You Might Need Root Canal</strong><br><br>&#x2022; Persistent, severe toothache<br>&#x2022; Sensitivity to hot that lingers after the stimulus is removed<br>&#x2022; Darkening or discolouration of a tooth<br>&#x2022; Swelling or tenderness in nearby gums<br>&#x2022; A recurring pimple on the gum (dental abscess)<br><br>If any of these sound familiar, please don't delay. An infected tooth won't heal on its own &mdash; the infection will only worsen. Call "+phoneInline+" promptly.",
            "&#x1F9B7; <strong>Root Canal vs Extraction &mdash; What's Better?</strong><br><br>We always try to save your natural tooth if possible:<br><br><strong>Root canal:</strong> Saves the tooth, maintains bite function, preserves bone<br><strong>Extraction:</strong> Removes the problem but leaves a gap which can cause shifting teeth<br><br>Root canal + crown often lasts for many years. Extraction then needs a bridge or denture to fill the gap &mdash; often costing more overall.<br><br>NHS root canal: &#163;75.30 (Band 2). Call "+phoneInline+".",
            "&#x1F9B7; <strong>Root Canal Recovery</strong><br><br>After treatment, most patients are pleasantly surprised by how manageable recovery is:<br><br>&#x2022; Some soreness for 2&ndash;5 days is normal<br>&#x2022; Take ibuprofen and paracetamol alternately as needed<br>&#x2022; Avoid chewing on the treated side until crowned<br>&#x2022; Eat soft foods initially<br>&#x2022; Most people return to normal activities the next day<br><br>Call us if pain is severe, worsening after day 3, or you notice new swelling. "+phoneInline,
            "&#x1F9B7; <strong>Root Canal &mdash; How Long Does It Take?</strong><br><br>Most root canals are completed in 1&ndash;2 visits:<br><br>&#x2022; <strong>Visit 1:</strong> Infection removed, canals cleaned, temporary filling placed<br>&#x2022; <strong>Visit 2:</strong> Canals sealed with permanent filling material (gutta-percha)<br>&#x2022; <strong>Visit 3:</strong> Crown placed to protect the tooth long-term<br><br>Each appointment takes around 45&ndash;90 minutes. You're numbed throughout &mdash; you'll feel nothing. NHS: &#163;75.30. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Root Canal Aftercare Tips</strong><br><br>Your treated tooth still needs care to last:<br><br>&#x2022; A crown after root canal is strongly recommended &mdash; without it the tooth may fracture<br>&#x2022; Brush and floss normally around the crown<br>&#x2022; Attend regular check-ups &mdash; the crown and root will be monitored<br>&#x2022; NHS crown cost: &#163;326.70 (Band 3), charged separately from the root canal<br><br>With proper care, a root-treated crowned tooth can last 10&ndash;20+ years. Call "+phoneInline+"."
        ]
    },
    {
        id: 'extractions',
        priority: 0,
        keywords: ['extraction','extract','pull tooth','tooth out','remove tooth','tooth removed','pulling a tooth','wisdom tooth','wisdom teeth','wisdom tooth removal','tooth pulling'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Tooth Extractions</strong><br><br>Sometimes a tooth needs to be removed &mdash; we make the process as comfortable as possible:<br><br>&#x2022; Local anaesthetic means you won't feel pain &mdash; just pressure<br>&#x2022; Includes wisdom tooth extractions<br>&#x2022; We always discuss replacement options afterwards<br>&#x2022; NHS Band 2 (&#163;75.30)<br><br><strong>Aftercare:</strong> Bite on gauze for 20 min, avoid hot drinks and smoking for 48 hours, eat soft foods, rinse with warm salt water from 24 hours post-extraction.<br><br>Call "+phoneInline+" if you're concerned.",
            "&#x1F9B7; <strong>Extractions</strong><br><br>We only extract a tooth when it's the best option for your long-term health. When we do:<br><br>&#x2022; Local anaesthetic ensures a pain-free procedure<br>&#x2022; Most extractions take just a few minutes<br>&#x2022; Wisdom teeth may take slightly longer<br>&#x2022; NHS: &#163;75.30 (Band 2)<br><br>After the extraction we'll discuss how to replace the tooth if needed (bridge or denture). Call "+phoneInline+".",
            "&#x1F9B7; <strong>Do You Need a Tooth Removed?</strong><br><br>Don't worry &mdash; extractions are very routine. Here's what to expect:<br><br>&#x2022; The area is thoroughly numbed before anything happens<br>&#x2022; You'll feel some pressure but no pain<br>&#x2022; The socket heals within 1&ndash;2 weeks<br>&#x2022; NHS Band 2: &#163;75.30<br><br>Recovery tips: soft foods, no smoking, warm salt water rinses from day 2. Call "+phoneInline+" with any concerns.",
            "&#x1F9B7; <strong>Wisdom Tooth Removal</strong><br><br>Wisdom teeth (third molars) often need removing if they're impacted, causing pain, or leading to infections:<br><br>&#x2022; Straightforward wisdom tooth extractions are done here under local anaesthetic<br>&#x2022; Complex cases may need referral to an oral surgeon<br>&#x2022; NHS Band 2: &#163;75.30<br>&#x2022; Recovery: 2&ndash;7 days, depending on complexity<br><br>Don't put up with wisdom tooth pain! Call "+phoneInline+".",
            "&#x1F9B7; <strong>Extraction Aftercare</strong><br><br>Following these instructions reduces the risk of complications:<br><br>&#x2022; Bite on gauze for 20 minutes immediately after<br>&#x2022; No hot drinks for 24 hours<br>&#x2022; No smoking, alcohol, or vigorous rinsing for 48 hours<br>&#x2022; Soft foods for 1&ndash;2 days<br>&#x2022; From day 2: warm salt water rinses 3x daily<br>&#x2022; Take paracetamol or ibuprofen as needed<br><br><strong>Signs of dry socket (days 2&ndash;4):</strong> Throbbing pain, bad taste. Call "+phoneInline+" immediately if concerned.",
            "&#x1F9B7; <strong>Replacing a Tooth After Extraction</strong><br><br>Once a tooth is removed, it's worth considering how to fill the gap:<br><br>&#x2022; <strong>Bridge:</strong> Fixed replacement, looks natural, NHS Band 3 (&#163;326.70)<br>&#x2022; <strong>Partial denture:</strong> Removable, affordable, NHS Band 3<br>&#x2022; <strong>Do nothing:</strong> Short-term OK for back teeth, but adjacent teeth can drift over time<br><br>We'll discuss your options at the appointment. No pressure &mdash; we just want you to make an informed choice. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Is Extraction Painful?</strong><br><br>This is the most common concern &mdash; and the answer is: not with proper anaesthetic!<br><br>&#x2022; Numbing gel applied to gum before the injection<br>&#x2022; Injection itself is very quick and mild<br>&#x2022; You'll feel firm pressure during the extraction &mdash; not pain<br>&#x2022; If at any point you feel pain: raise your hand and we stop immediately<br>&#x2022; Some soreness for 24&ndash;72 hours after is normal &mdash; manageable with over-the-counter pain relief<br><br>Trust us &mdash; it's always less bad than people expect. Call "+phoneInline+".",
            "&#x1F9B7; <strong>When Is Extraction Necessary?</strong><br><br>We explore every option before recommending extraction. We'd recommend it when:<br><br>&#x2022; A tooth is too decayed to be saved with a filling or crown<br>&#x2022; Advanced gum disease has destroyed supporting bone<br>&#x2022; A tooth is cracked beyond repair<br>&#x2022; Baby teeth haven't fallen out and are blocking adult teeth<br>&#x2022; Overcrowding before orthodontic treatment<br><br>If extraction is needed, we'll explain why and discuss alternatives. Call "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // TREATMENTS — Orthodontics
    // ════════════════════════════════════════
    {
        id: 'orthodontics',
        priority: 0,
        keywords: ['brace','braces','invisalign','straight teeth','teeth straightening','orthodontic','orthodontics','clear aligners','aligners','teeth alignment','straighten'],
        weight: 6,
        responses: [
            "We don't currently offer orthodontic treatment (braces or Invisalign) at Heathway Dental.<br><br>If you need teeth straightening, your dentist can assess your teeth and refer you to a specialist orthodontist if appropriate.<br><br>Call "+phoneInline+" to book a check-up and discuss your options.",
            "Orthodontic treatment (braces, Invisalign, clear aligners) isn't something we provide, but we can help with the next steps:<br><br>&#x2022; Book a check-up and we'll assess your teeth<br>&#x2022; If straightening is appropriate, we can refer you to a specialist orthodontist<br>&#x2022; NHS orthodontic referrals are available for under-18s with clinical need<br><br>Call "+phoneInline+" to get started.",
            "We don't offer braces or aligners at our practice. However, crooked or misaligned teeth are worth discussing with us:<br><br>&#x2022; We'll assess whether the issue is purely cosmetic or affects function/hygiene<br>&#x2022; We can refer to an NHS or private orthodontist<br>&#x2022; In the meantime, good oral hygiene is even more important with crowded teeth<br><br>Book an assessment: "+phoneInline
        ]
    },

    // ════════════════════════════════════════
    // TREATMENTS — Preventive
    // ════════════════════════════════════════
    {
        id: 'scale_polish',
        priority: 0,
        keywords: ['scale and polish','scale polish','hygienist','hygiene','teeth cleaning','clean teeth','professional cleaning','deep clean','plaque removal','tartar removal','stain removal','hygiene appointment'],
        weight: 5,
        responses: [
            "&#x2728; <strong>Scale &amp; Polish (Hygiene)</strong><br><br>Professional cleaning keeps your mouth at its healthiest:<br><br>&#x2022; Removes plaque and hardened tartar that brushing can't reach<br>&#x2022; Polishes away surface stains (tea, coffee, red wine)<br>&#x2022; Prevents and treats gum disease<br>&#x2022; Freshens breath significantly<br>&#x2022; Recommended every 6 months<br>&#x2022; Included in NHS Band 1 (&#163;27.40) if clinically indicated<br><br>Book a hygiene appointment: "+phoneInline,
            "&#x2728; <strong>Professional Teeth Cleaning</strong><br><br>Even the most diligent brusher and flosser can't remove everything &mdash; that's what our hygiene visits are for:<br><br>&#x2022; Ultrasonic scaler removes hard tartar painlessly<br>&#x2022; Polish removes surface stains<br>&#x2022; Gum check included<br>&#x2022; Personalised oral hygiene tips<br>&#x2022; NHS: included in Band 1 when indicated<br><br>Call "+phoneInline+" to book.",
            "&#x2728; <strong>Scale &amp; Polish</strong><br><br>A hygiene appointment every 6 months is one of the best investments in your dental health:<br><br>&#x2022; Prevents gum disease &mdash; the main cause of tooth loss in adults<br>&#x2022; Removes calculus (hardened plaque) before it causes damage<br>&#x2022; Your mouth will feel incredibly fresh afterwards<br>&#x2022; NHS Band 1 includes this if clinically needed<br><br>Call "+phoneInline+" to book.",
            "&#x2728; <strong>What Happens During a Scale &amp; Polish?</strong><br><br>Here's exactly what to expect:<br><br>&#x2022; The dentist or hygienist uses an ultrasonic scaler to remove hardened tartar<br>&#x2022; Hand instruments clean below the gum line<br>&#x2022; A rotating polishing cup removes staining<br>&#x2022; The whole appointment usually takes 30&ndash;45 minutes<br>&#x2022; A little sensitivity is normal for 24 hours after<br><br>Completely painless for most patients. Book: "+phoneInline,
            "&#x2728; <strong>Do I Need a Hygiene Appointment?</strong><br><br>Signs you're overdue for a scale &amp; polish:<br><br>&#x2022; Your gums bleed when you brush<br>&#x2022; You notice tartar build-up (hard, yellowish deposits)<br>&#x2022; Teeth feel rough or coated<br>&#x2022; Bad breath despite good home care<br>&#x2022; It's been more than 6 months since your last one<br><br>Don't wait &mdash; tartar can only be removed professionally. Call "+phoneInline+".",
            "&#x2728; <strong>Scale &amp; Polish vs Deep Clean</strong><br><br>Standard scale &amp; polish cleans above the gum line. A deep clean (root planing) cleans below:<br><br>&#x2022; <strong>Scale &amp; polish:</strong> Routine maintenance, NHS Band 1<br>&#x2022; <strong>Root planing:</strong> For established gum disease, removes bacteria from root surfaces, may need local anaesthetic<br><br>Your dentist will recommend which you need based on your gum assessment. Call "+phoneInline+" to book.",
            "&#x2728; <strong>How to Keep Your Teeth Clean Between Hygiene Visits</strong><br><br>Professional cleaning plus a great home routine = healthy teeth:<br><br>&#x2022; Brush twice daily with fluoride toothpaste (spit, don't rinse)<br>&#x2022; Clean between teeth daily with TePe brushes or floss<br>&#x2022; Use a fluoride mouthwash at a different time to brushing<br>&#x2022; Cut down on sugary snacks and acidic drinks<br>&#x2022; Book hygiene appointments every 6 months<br><br>Call "+phoneInline+" to arrange your next hygiene visit."
        ]
    },
    {
        id: 'checkup',
        priority: 0,
        keywords: ['check-up','checkup','check up','examination','exam','routine appointment','dental exam','annual check','regular appointment','dental check'],
        weight: 5,
        responses: [
            "&#x2705; <strong>Dental Check-ups</strong><br><br>Regular check-ups are the cornerstone of good dental health:<br><br>&#x2022; Thorough examination of teeth, gums, and soft tissues<br>&#x2022; Digital X-rays if needed<br>&#x2022; Oral cancer screening<br>&#x2022; Scale &amp; polish if clinically indicated<br>&#x2022; Personalised home care advice<br>&#x2022; NHS Band 1: <strong>&#163;27.40</strong> (free for exempt patients)<br><br>We recommend check-ups every 6&ndash;12 months. Book yours: "+phoneInline,
            "&#x2705; <strong>Book a Check-up</strong><br><br>It's the most important dental appointment you can make! At your check-up we:<br><br>&#x2022; Examine every tooth for decay<br>&#x2022; Check your gums for disease<br>&#x2022; Screen for oral cancer<br>&#x2022; Review your X-rays<br>&#x2022; Give you personalised advice<br><br>NHS Band 1: &#163;27.40. Don't wait until something hurts &mdash; early problems are much easier (and cheaper!) to treat. Call "+phoneInline+".",
            "&#x2705; <strong>Why Regular Check-ups Matter</strong><br><br>&#x2022; Catch decay early when it's still a small filling, not a crown<br>&#x2022; Detect gum disease before it causes tooth loss<br>&#x2022; Oral cancer detected early is highly treatable<br>&#x2022; Keep your NHS registration active<br>&#x2022; Cost: &#163;27.40 (Band 1) &mdash; free if exempt<br><br>Every 6&ndash;12 months is ideal. Call "+phoneInline+" to book.",
            "&#x2705; <strong>What Happens at a Check-up?</strong><br><br>A Heathway Dental check-up is thorough and takes about 20&ndash;30 minutes:<br><br>&#x2022; Each tooth examined for decay and wear<br>&#x2022; Gum pockets measured for signs of gum disease<br>&#x2022; Soft tissues (tongue, cheeks, palate) checked for abnormalities<br>&#x2022; X-rays taken if indicated<br>&#x2022; Scale &amp; polish if clinically needed<br>&#x2022; Home care advice and treatment plan discussed<br><br>NHS: &#163;27.40. Book now: "+phoneInline,
            "&#x2705; <strong>How Often Do I Need a Check-up?</strong><br><br>The frequency depends on your individual risk:<br><br>&#x2022; <strong>Low risk (good hygiene, no problems):</strong> Every 12&ndash;24 months<br>&#x2022; <strong>Average risk:</strong> Every 6&ndash;12 months<br>&#x2022; <strong>High risk (gum disease, diabetes, dry mouth):</strong> Every 3&ndash;6 months<br><br>Your dentist will recommend the right interval for you. The NHS covers the cost regardless of frequency. Call "+phoneInline+".",
            "&#x2705; <strong>New Patient Check-up</strong><br><br>If you're registering with us for the first time, your first appointment includes:<br><br>&#x2022; Full dental and medical history review<br>&#x2022; Comprehensive examination of all teeth and gums<br>&#x2022; Full mouth X-rays to establish a baseline<br>&#x2022; Treatment plan discussion<br>&#x2022; Any urgent issues addressed<br><br>NHS Band 1: &#163;27.40. Registering is easy &mdash; just call "+phoneInline+".",
            "&#x2705; <strong>Don't Wait Until It Hurts!</strong><br><br>This is the most important message we can share:<br><br>&#x2022; Most dental problems are <strong>painless until advanced</strong><br>&#x2022; A small cavity: &#163;75.30 to fill. Left untreated: root canal + crown = &#163;402.10<br>&#x2022; Early gum disease: reversible. Advanced gum disease: causes permanent bone loss<br>&#x2022; Oral cancer caught early: highly survivable. Late detection: far more serious<br><br>Prevention costs a fraction of the cure. Call "+phoneInline+" today."
        ]
    },
    {
        id: 'xrays',
        priority: 0,
        keywords: ['x-ray','x ray','xray','radiograph','dental x-ray','bitewing','panoramic','radiation','dental scan'],
        weight: 5,
        responses: [
            "&#x1F4F7; <strong>Dental X-Rays</strong><br><br>X-rays are essential for detecting problems invisible to the naked eye:<br><br>&#x2022; Decay hiding between teeth<br>&#x2022; Bone loss from gum disease<br>&#x2022; Impacted wisdom teeth<br>&#x2022; Infections at the root<br>&#x2022; Hidden cysts or tumours<br><br>Our digital X-rays use <strong>minimal radiation</strong> &mdash; far less than a chest X-ray &mdash; and are completely safe. Included in NHS Band 1 check-ups when clinically needed.",
            "&#x1F4F7; <strong>Are Dental X-Rays Safe?</strong><br><br>Absolutely. Modern digital X-rays deliver extremely low doses of radiation &mdash; about equivalent to a short flight.<br><br>They're essential for diagnosis:<br>&#x2022; Spotting cavities early<br>&#x2022; Monitoring bone levels<br>&#x2022; Planning extractions and treatments<br>&#x2022; Checking wisdom tooth position<br><br>Included in NHS Band 1 when clinically indicated.",
            "&#x1F4F7; <strong>Dental X-Rays</strong><br><br>We take X-rays when clinically needed &mdash; not routinely for every visit. When we do take them:<br><br>&#x2022; Digital sensors for minimal radiation<br>&#x2022; Results are instant &mdash; we discuss them with you immediately<br>&#x2022; Different types: bitewing (decay), periapical (roots), panoramic (full jaw)<br><br>They're an essential tool for accurate diagnosis. Included in NHS Band 1.",
            "&#x1F4F7; <strong>Types of Dental X-Rays</strong><br><br>Different X-rays show different things:<br><br>&#x2022; <strong>Bitewing:</strong> Shows decay between teeth and bone levels &mdash; most common<br>&#x2022; <strong>Periapical:</strong> Shows root tips, infections, and bone around individual teeth<br>&#x2022; <strong>Panoramic (OPG):</strong> Full jaw view &mdash; shows all teeth, wisdom teeth, sinuses<br><br>We only take the X-rays needed for your specific situation. All included in NHS Band 1 when clinically indicated.",
            "&#x1F4F7; <strong>X-Rays &amp; Pregnancy</strong><br><br>If you're pregnant, tell us before any X-ray.<br><br>In most cases, dental X-rays during pregnancy are safe when clinically necessary:<br>&#x2022; Digital X-rays use very low radiation<br>&#x2022; A leaded thyroid collar and apron are always used<br>&#x2022; We only take X-rays if genuinely needed<br><br>Untreated dental infections during pregnancy carry greater risk than a dental X-ray. We'll always discuss with you first. Call "+phoneInline+".",
            "&#x1F4F7; <strong>How Often Are X-Rays Taken?</strong><br><br>We follow FGDP and NHS guidelines:<br><br>&#x2022; New patients: bitewing X-rays as a baseline<br>&#x2022; Routine patients: every 1&ndash;2 years depending on risk<br>&#x2022; High-risk patients (gum disease, high decay): more frequently<br>&#x2022; Specific symptoms: whenever clinically necessary<br><br>We always explain why we're taking X-rays and what we're looking for. Included in NHS Band 1 charge.",
            "&#x1F4F7; <strong>Reading Your Dental X-Rays</strong><br><br>We explain what we see straight away. Common findings include:<br><br>&#x2022; <strong>Dark shadow in tooth:</strong> Cavity or decay<br>&#x2022; <strong>Dark shadow at root tip:</strong> Infection or abscess<br>&#x2022; <strong>Bone level changes:</strong> Gum disease<br>&#x2022; <strong>Impacted tooth:</strong> Tooth that hasn't erupted fully<br><br>Never be afraid to ask questions about your X-rays &mdash; we're happy to walk you through exactly what we're seeing."
        ]
    },
    {
        id: 'fluoride',
        priority: 0,
        keywords: ['fluoride','fluoride treatment','fluoride varnish','fluoride toothpaste','fluoride for kids','fluoride application'],
        weight: 4,
        responses: [
            "&#x1F9B7; <strong>Fluoride Treatment</strong><br><br>Fluoride is nature's cavity fighter! It strengthens tooth enamel and reverses early decay.<br><br>&#x2022; Fluoride varnish applied at check-ups (especially for children)<br>&#x2022; High-fluoride toothpaste available on prescription for high-risk patients<br>&#x2022; Safe for all ages in professional doses<br>&#x2022; Particularly beneficial for: children, elderly patients, high decay risk<br><br>Ask your dentist about fluoride at your next visit!",
            "&#x1F9B7; <strong>Fluoride &mdash; Why It Matters</strong><br><br>Fluoride is one of the most effective preventive tools in dentistry:<br><br>&#x2022; Remineralises early decay before it becomes a cavity<br>&#x2022; Makes enamel more resistant to acid attack<br>&#x2022; Safe when used professionally<br>&#x2022; Varnish applied in seconds at your check-up<br><br>Adults can benefit too, not just children! Speak to Dr Kaushal at your next appointment.",
            "&#x1F9B7; <strong>Fluoride Treatments</strong><br><br>We offer professional fluoride varnish and can prescribe high-fluoride toothpaste for at-risk patients. It's one of the most cost-effective ways to prevent decay.<br><br>Especially recommended for:<br>&#x2022; Children (from first tooth onwards)<br>&#x2022; Patients with high decay history<br>&#x2022; Dry mouth sufferers<br>&#x2022; Orthodontic patients<br><br>Ask at your next check-up!",
            "&#x1F9B7; <strong>Fluoride Varnish for Children</strong><br><br>Fluoride varnish is routinely applied to children's teeth at check-ups:<br><br>&#x2022; Painted on in seconds &mdash; totally painless<br>&#x2022; Particularly effective on newly erupted adult teeth<br>&#x2022; Recommended by NHS NICE guidelines from age 3<br>&#x2022; Applied 2&ndash;4 times a year for high-risk children<br>&#x2022; Free as part of NHS Band 1<br><br>Register your child: "+phoneInline,
            "&#x1F9B7; <strong>Do Adults Need Fluoride Treatment?</strong><br><br>Absolutely &mdash; fluoride isn't just for children:<br><br>&#x2022; Adults with dry mouth, gum recession, or high decay history benefit most<br>&#x2022; High-fluoride prescription toothpaste (5000ppm) available for at-risk adults<br>&#x2022; Fluoride varnish at hygiene visits provides a concentrated boost<br>&#x2022; Over-the-counter 1450ppm toothpaste is sufficient for most adults<br><br>Ask your dentist if a high-fluoride prescription would benefit you at your next check-up.",
            "&#x1F9B7; <strong>Is Fluoride Safe?</strong><br><br>Yes &mdash; in the amounts used in dentistry, fluoride is completely safe and highly effective:<br><br>&#x2022; Used in UK water fluoridation and toothpaste for over 50 years<br>&#x2022; Endorsed by the BDA, NHS, and WHO<br>&#x2022; Professional fluoride varnish is applied in tiny, targeted amounts<br>&#x2022; Fluorosis (excess fluoride marks) only occurs with prolonged excessive ingestion &mdash; not from normal dental use<br><br>Any questions? Ask at your next visit!"
        ]
    },
    {
        id: 'sealants',
        priority: 0,
        keywords: ['sealant','sealants','fissure sealant','fissure seal','protective coating','back teeth protection','molar protection'],
        weight: 4,
        responses: [
            "&#x1F9B7; <strong>Fissure Sealants</strong><br><br>Fissure sealants protect the grooves of back teeth where decay most often starts:<br><br>&#x2022; Thin plastic coating applied painlessly to biting surfaces<br>&#x2022; No drilling required<br>&#x2022; Quick to apply &mdash; takes just a few minutes<br>&#x2022; Can last several years<br>&#x2022; Especially recommended for children when adult molars come through<br><br>Ask about sealants at your child's next check-up!",
            "&#x1F9B7; <strong>Fissure Sealants &mdash; Cavity Prevention</strong><br><br>The deep grooves of back teeth are hard to clean and prone to decay. Sealants solve this:<br><br>&#x2022; Painless, quick, no anaesthetic needed<br>&#x2022; Seals off the fissures so bacteria can't get in<br>&#x2022; Ideal for children aged 6&ndash;14 when molars erupt<br>&#x2022; Adults can benefit too<br>&#x2022; Very cost-effective prevention<br><br>Call "+phoneInline+" to ask about sealants.",
            "&#x1F9B7; <strong>What Are Fissure Sealants?</strong><br><br>Think of them as a shield for your back teeth:<br><br>&#x2022; Applied like a varnish &mdash; completely painless<br>&#x2022; Bonds into the grooves of molars<br>&#x2022; Prevents food and bacteria getting into crevices<br>&#x2022; Dramatically reduces decay risk in molars<br>&#x2022; Best applied as soon as adult molars appear (around age 6&ndash;7)<br><br>Ask your dentist at the next check-up!",
            "&#x1F9B7; <strong>Sealants &mdash; How Long Do They Last?</strong><br><br>Fissure sealants are durable but do need monitoring:<br><br>&#x2022; Well-placed sealants last <strong>5&ndash;10 years</strong><br>&#x2022; We check them at every check-up<br>&#x2022; If chipped or worn, they can be easily reapplied<br>&#x2022; Some studies show sealants reduce molar decay by up to 80%<br><br>A small cost now avoids a much larger filling later. Ask about sealants for your child at their next check-up. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Are Sealants Available on the NHS?</strong><br><br>Yes &mdash; fissure sealants are available on the NHS for children:<br><br>&#x2022; Free for children under 18 as part of NHS dental care<br>&#x2022; Applied at the dentist during a routine check-up or short appointment<br>&#x2022; No drilling, no anaesthetic &mdash; totally painless<br>&#x2022; Most effective on newly erupted first and second molars (ages 6&ndash;7 and 11&ndash;13)<br><br>Call "+phoneInline+" to register your child and ask about sealants.",
            "&#x1F9B7; <strong>Sealants for Adults</strong><br><br>Fissure sealants aren't just for children &mdash; adults can benefit too:<br><br>&#x2022; Deep fissures in back teeth can be sealed at any age<br>&#x2022; Especially useful if you have a history of molar decay<br>&#x2022; Quick, painless, no injection needed<br>&#x2022; More cost-effective than treating a cavity<br><br>Ask about adult sealants at your next check-up or call "+phoneInline+"."
        ]
    },
    {
        id: 'mouthguards',
        priority: 0,
        keywords: ['mouthguard','gum shield','sports guard','sports mouthguard','protect teeth sport','rugby mouthguard','boxing mouthguard','hockey mouthguard','contact sport teeth'],
        weight: 5,
        responses: [
            "&#x1F3C6; <strong>Custom Sports Mouthguards</strong><br><br>Custom mouthguards offer far superior protection to shop-bought ones:<br><br>&#x2022; Made from impressions of your own teeth &mdash; perfect fit<br>&#x2022; More comfortable &mdash; you can even talk in them<br>&#x2022; Much better shock absorption<br>&#x2022; Essential for contact sports: rugby, boxing, martial arts, hockey<br>&#x2022; Available in custom colours and designs<br><br>Call "+phoneInline+" to arrange a fitting.",
            "&#x1F3C6; <strong>Protect Your Teeth During Sport</strong><br><br>A knocked-out tooth costs far more to fix than a custom mouthguard!<br><br>&#x2022; Takes just one appointment to fit<br>&#x2022; Made from high-quality, safe materials<br>&#x2022; Fits perfectly &mdash; won't fall out mid-game<br>&#x2022; Recommended by all major sporting bodies<br><br>Book a mouthguard fitting: "+phoneInline,
            "&#x1F3C6; <strong>Mouthguards</strong><br><br>Any sport where you could take a hit to the face warrants a mouthguard:<br><br>&#x2022; Custom-fitted &mdash; incomparably better than off-the-shelf<br>&#x2022; Protects teeth, gums, lips, and jaw<br>&#x2022; Can reduce concussion risk<br>&#x2022; Lasts 1&ndash;2 seasons<br><br>Call "+phoneInline+" to book a quick fitting appointment.",
            "&#x1F3C6; <strong>Custom vs Shop-Bought Mouthguards</strong><br><br>The difference is significant:<br><br>&#x2022; <strong>Custom:</strong> Made from impressions of your teeth &mdash; perfect fit, maximum protection, comfortable to wear<br>&#x2022; <strong>Shop-bought:</strong> One-size-fits-all, poor fit, easier to knock out, less shock absorption<br><br>Sports governing bodies universally recommend custom guards. One knocked-out tooth will cost far more to replace than the mouthguard. Call "+phoneInline+".",
            "&#x1F3C6; <strong>Mouthguard Fitting Appointment</strong><br><br>Getting a custom mouthguard is simple:<br><br>1. Call us to arrange a short appointment<br>2. Impressions taken &mdash; takes just a few minutes<br>3. Guard made and fitted, usually within 1&ndash;2 weeks<br>4. Ready for the pitch or ring!<br><br>Available in a range of colours and thicknesses. Call "+phoneInline+" to arrange yours.",
            "&#x1F3C6; <strong>Which Sports Need a Mouthguard?</strong><br><br>The BSI recommends mouthguards for many sports:<br><br>&#x2022; Rugby (strongly recommended at all levels)<br>&#x2022; Boxing and martial arts<br>&#x2022; Hockey (field and ice)<br>&#x2022; Basketball, football, cricket<br>&#x2022; Skateboarding and BMX<br>&#x2022; Any contact or high-speed sport<br><br>Don't risk your smile &mdash; call "+phoneInline+" and get a custom guard made."
        ]
    },
    {
        id: 'night_guards',
        priority: 0,
        keywords: ['night guard','night guards','grinding','bruxism','clenching','clench teeth','tmj','jaw pain','clicking jaw','jaw clicking','tooth grinding','grinding my teeth','grind my teeth','i grind','grind teeth at night','grinding at night','wake up with jaw pain','headache from teeth','teeth grinding','jaw clenching'],
        weight: 6,
        responses: [
            "&#x1F634; <strong>Night Guards &amp; Teeth Grinding (Bruxism)</strong><br><br>Grinding is more common than you might think &mdash; often stress-related and happening while you sleep.<br><br><strong>Signs you might grind:</strong><br>&#x2022; Waking with a sore jaw or headache<br>&#x2022; Worn, flat, or sensitive teeth<br>&#x2022; Clicking or popping jaw joint<br>&#x2022; Partner tells you they hear grinding at night<br><br><strong>Solution:</strong> A custom night guard &mdash; much more effective than shop-bought versions &mdash; protects your teeth while you sleep.<br><br>Book an assessment: "+phoneInline,
            "&#x1F634; <strong>Teeth Grinding &amp; Night Guards</strong><br><br>Bruxism (grinding) can cause significant tooth wear over time, plus jaw pain (TMJ disorder) and headaches.<br><br>&#x2022; Custom night guards take the force off your teeth<br>&#x2022; Comfortable to wear &mdash; custom-fitted to your bite<br>&#x2022; Lasts 5+ years with care<br>&#x2022; Far superior to anything from a chemist<br><br>We also check for wear patterns at your check-up. Call "+phoneInline+" if you suspect grinding.",
            "&#x1F634; <strong>TMJ &amp; Grinding</strong><br><br>Jaw clicking, headaches, and worn teeth can all be signs of bruxism (grinding) or TMJ dysfunction.<br><br>Treatment options:<br>&#x2022; Custom night guard to protect teeth<br>&#x2022; Bite adjustment if needed<br>&#x2022; Relaxation and stress management advice<br>&#x2022; Botox for severe jaw clenching (private)<br><br>Call "+phoneInline+" for a TMJ/grinding assessment.",
            "&#x1F634; <strong>Do I Grind My Teeth?</strong><br><br>Many grinders don't know they do it &mdash; it often happens during sleep. Tell-tale signs:<br><br>&#x2022; Teeth look flattened or worn down<br>&#x2022; Jaw muscles feel sore or tired in the morning<br>&#x2022; Waking with headaches<br>&#x2022; Clicking or locking jaw<br>&#x2022; Cracked or chipped teeth with no obvious cause<br>&#x2022; Partner hears grinding sounds at night<br><br>We can assess for wear at a check-up. Call "+phoneInline+".",
            "&#x1F634; <strong>Night Guard Care &amp; Maintenance</strong><br><br>Looking after your night guard ensures it lasts:<br><br>&#x2022; Rinse with cold water every morning before storing<br>&#x2022; Brush gently with a toothbrush (no toothpaste &mdash; it's abrasive)<br>&#x2022; Soak weekly in denture solution or mild mouthwash<br>&#x2022; Store in a ventilated case &mdash; not a sealed one<br>&#x2022; Bring to check-ups for inspection<br>&#x2022; Replace when visibly worn through or no longer fitting well<br><br>Call "+phoneInline+" if your guard needs replacing.",
            "&#x1F634; <strong>Night Guards &mdash; How Are They Made?</strong><br><br>A custom night guard takes just 2&ndash;3 appointments:<br><br>1. <strong>Assessment:</strong> We check wear patterns and discuss your symptoms<br>2. <strong>Impressions:</strong> Taken of upper and/or lower teeth<br>3. <strong>Fitting:</strong> Guard adjusted for perfect fit and bite<br><br>Most patients notice an immediate improvement in morning jaw soreness. Private treatment &mdash; call "+phoneInline+" for current pricing.",
            "&#x1F634; <strong>Can I Stop Grinding?</strong><br><br>Bruxism often has a stress component, so managing stress helps, but grinding is largely involuntary:<br><br>&#x2022; Stress management techniques can reduce frequency<br>&#x2022; Avoid caffeine and alcohol, especially in the evening<br>&#x2022; A night guard protects teeth even if grinding continues<br>&#x2022; In severe cases, Botox into the masseter (jaw) muscle reduces clenching force<br><br>The most practical first step: a custom night guard. Call "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // SERVICES OVERVIEW
    // ════════════════════════════════════════
    {
        id: 'services_overview',
        priority: 0,
        keywords: ['services','treatments','what do you offer','what do you do','options available','treatment list','all services','full list','menu','what can you treat','what treatments','your services','list of services','your treatments','what treatments do you offer'],
        weight: 6,
        responses: [
            "&#x1F9B7; <strong>Our Services</strong><br><br><strong>General &amp; Preventive:</strong> Check-ups, X-rays, scale &amp; polish, oral hygiene advice<br><strong>Restorative:</strong> Fillings, crowns, bridges, dentures, root canal<br><strong>Surgical:</strong> Tooth extractions, wisdom teeth removal<br><strong>Gum Care:</strong> Gum disease treatment and management<br><strong>Other:</strong> Children's dentistry, emergency care<br><br>Both <strong>NHS and private</strong> options available.<br><br>Visit our <a href='heathway-services.html' style='color:var(--teal)'>Services page</a> or call "+phoneInline+" for details.",
            "&#x1F9B7; <strong>What We Offer at Heathway Dental</strong><br><br>We provide comprehensive NHS and private dental care:<br><br>&#x2022; <strong>Check-ups &amp; cleaning:</strong> Examinations, X-rays, scale &amp; polish<br>&#x2022; <strong>Restorative:</strong> Fillings, root canals, crowns, bridges, dentures<br>&#x2022; <strong>Extractions:</strong> Simple and surgical, including wisdom teeth<br>&#x2022; <strong>Gum disease:</strong> Treatment and ongoing management<br>&#x2022; <strong>Children's dentistry:</strong> Gentle care for under 17s<br>&#x2022; <strong>Emergency care:</strong> Urgent dental appointments<br><br>Call "+phoneInline+" to discuss your needs.",
            "&#x1F9B7; <strong>Full Treatment Range</strong><br><br>From routine check-ups to restorative work &mdash; we're here for your dental health:<br><br>&#x2022; NHS and private treatments<br>&#x2022; General, restorative, and preventive care<br>&#x2022; Emergency and urgent appointments<br>&#x2022; Children's and family dentistry<br>&#x2022; Dentures, crowns, and bridges<br><br>Not sure what you need? Book a check-up and we'll advise. "+phoneInline,
            "&#x1F9B7; <strong>NHS vs Private &mdash; What's the Difference?</strong><br><br>We offer both, so it's worth understanding:<br><br><strong>NHS:</strong> Excellent standard care, fixed band charges (&#163;27.40 / &#163;75.30 / &#163;326.70), covers most treatments<br><strong>Private:</strong> More materials choices, longer appointments, additional options (e.g. flexible dentures, ceramic inlays)<br><br>Most patients are seen on the NHS. Private is available where it adds real value. Call "+phoneInline+" to discuss.",
            "&#x1F9B7; <strong>Heathway Dental &mdash; Your Complete Local Practice</strong><br><br>We're a full-service NHS and private practice in Dagenham:<br><br>&#x2022; Routine and emergency care<br>&#x2022; Restorative treatments (fillings, crowns, bridges, dentures, root canal)<br>&#x2022; Preventive care (scale &amp; polish, fluoride, sealants)<br>&#x2022; Children's dentistry (free under 18)<br>&#x2022; Gum disease treatment<br>&#x2022; Sports mouthguards, night guards<br><br>Visit our <a href='heathway-services.html' style='color:var(--teal)'>Services page</a> or call "+phoneInline+".",
            "&#x1F9B7; <strong>Not Sure What Treatment You Need?</strong><br><br>That's what we're here for! A check-up appointment is the perfect starting point:<br><br>&#x2022; We'll assess your teeth and gums thoroughly<br>&#x2022; Explain exactly what, if anything, needs treatment<br>&#x2022; Give you a clear treatment plan with costs<br>&#x2022; Never pressure you into unnecessary treatment<br><br>NHS Band 1: &#163;27.40. Book a check-up: "+phoneInline
        ]
    },

    // ════════════════════════════════════════
    // DENTAL CONDITIONS
    // ════════════════════════════════════════
    {
        id: 'decay_cavities',
        priority: 0,
        keywords: ['cavity','cavities','decay','hole in tooth','rotten tooth','tooth decay','decayed tooth','caries','dental caries'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Tooth Decay &amp; Cavities</strong><br><br>Cavities form when bacteria in plaque produce acids that attack enamel.<br><br><strong>Prevention:</strong><br>&#x2022; Brush twice daily with fluoride toothpaste<br>&#x2022; Floss or use interdental brushes daily<br>&#x2022; Limit sugary and acidic food/drinks<br>&#x2022; Regular check-ups every 6&ndash;12 months<br><br><strong>Treatment:</strong> Small cavities need a simple filling. Left untreated, decay reaches the nerve &mdash; then you need root canal or extraction. Early treatment is always simpler!<br><br>Book a check-up: "+phoneInline,
            "&#x1F9B7; <strong>Dental Decay</strong><br><br>Tooth decay is the most common dental problem &mdash; and the most preventable.<br><br>&#x2022; Early decay: no symptoms, treated with a small filling<br>&#x2022; Moderate decay: sensitivity, pain, larger filling or crown<br>&#x2022; Advanced decay: toothache, infection, root canal or extraction<br><br>Don't wait for pain &mdash; regular check-ups catch it early. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Worried About a Cavity?</strong><br><br>Common signs: sensitivity to sweet/cold, visible dark spot, rough edge, toothache.<br><br>&#x2022; We'll confirm with X-rays at your check-up<br>&#x2022; Small cavities = small, quick fillings<br>&#x2022; We use tooth-coloured composite for natural results<br>&#x2022; NHS Band 2: &#163;75.30 covers fillings<br><br>The earlier the better! Call "+phoneInline+".",
            "&#x1F9B7; <strong>How Does Decay Form?</strong><br><br>Understanding decay helps you prevent it:<br><br>&#x2022; Bacteria in plaque feed on sugar and produce acid<br>&#x2022; Acid attacks enamel, creating a 'white spot' lesion<br>&#x2022; If not stopped, this progresses into a cavity through the enamel and dentine<br>&#x2022; If left further, it reaches the nerve &mdash; causing pain and abscess<br><br>Fluoride toothpaste, flossing, and check-ups every 6&ndash;12 months break this cycle. Book: "+phoneInline,
            "&#x1F9B7; <strong>Decay in Children</strong><br><br>Tooth decay is the most common chronic childhood disease in the UK, yet almost entirely preventable:<br><br>&#x2022; Start brushing as soon as the first tooth appears<br>&#x2022; Use a smear of 1000ppm fluoride toothpaste for under-3s<br>&#x2022; Limit sugary drinks and snacks &mdash; especially between meals<br>&#x2022; Book their first dental visit at age 1<br>&#x2022; Fissure sealants and fluoride varnish provide extra protection<br><br>Register your child: "+phoneInline,
            "&#x1F9B7; <strong>Can Decay Be Reversed?</strong><br><br>Yes &mdash; in its earliest stage! Once you have a cavity, a filling is needed, but early decay can be remineralised:<br><br>&#x2022; <strong>White spots:</strong> Early enamel demineralisation &mdash; treatable with fluoride and improved hygiene<br>&#x2022; <strong>Cavities:</strong> Need a filling to stop progression<br>&#x2022; <strong>Deep cavities:</strong> May need root canal treatment<br><br>That's why catching it early at a check-up is so valuable. Call "+phoneInline+"."
        ]
    },
    {
        id: 'gum_disease',
        priority: 0,
        keywords: ['gum disease','gum bleeding','bleeding gums','gingivitis','periodontitis','periodontal','receding gums','gum recession','gums bleed','swollen gums','gum infection','gum problem','gum health','gum care'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Gum Disease</strong><br><br>Gum disease is the leading cause of tooth loss in adults &mdash; but it's preventable and treatable.<br><br><strong>Stages:</strong><br>&#x2022; <strong>Gingivitis:</strong> Gums bleed when brushing &mdash; reversible with good hygiene<br>&#x2022; <strong>Periodontitis:</strong> Bone loss occurs &mdash; needs professional treatment<br><br><strong>Signs:</strong> Bleeding, swollen, or receding gums; bad breath; loose teeth; pain when chewing<br><br><strong>Treatment:</strong> Deep cleaning (root planing), hygiene visits, improved home care<br><br>Don't ignore bleeding gums! Call "+phoneInline+".",
            "&#x1F9B7; <strong>Gum Disease &mdash; Act Now</strong><br><br>Bleeding gums are not normal &mdash; they're a warning sign.<br><br>&#x2022; Caused by plaque build-up at the gum line<br>&#x2022; Early stage (gingivitis): entirely reversible<br>&#x2022; Advanced stage: bone loss is irreversible, but progression can be stopped<br>&#x2022; Linked to heart disease, diabetes, and pregnancy complications<br><br>Treatment involves professional cleaning and better home care. Don't delay &mdash; call "+phoneInline+".",
            "&#x1F9B7; <strong>Bleeding or Swollen Gums?</strong><br><br>This is almost always gum disease. Here's what to know:<br><br>&#x2022; Keep brushing &mdash; don't stop because gums bleed (this is the wrong response!)<br>&#x2022; Add flossing or interdental brushes to your routine<br>&#x2022; Book a hygiene appointment for professional cleaning<br>&#x2022; Regular hygiene visits prevent gum disease from progressing<br><br>Call "+phoneInline+" to book a gum assessment.",
            "&#x1F9B7; <strong>Gum Disease &amp; Your General Health</strong><br><br>The mouth is connected to the whole body &mdash; gum disease has been linked to:<br><br>&#x2022; <strong>Heart disease</strong> &mdash; oral bacteria can enter the bloodstream<br>&#x2022; <strong>Diabetes</strong> &mdash; gum disease makes blood sugar harder to control<br>&#x2022; <strong>Pregnancy complications</strong> &mdash; increased risk of premature birth<br>&#x2022; <strong>Dementia</strong> &mdash; research suggests a link with chronic oral inflammation<br><br>Good gum health really does affect your whole body. Don't ignore the signs. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Treating Gum Disease</strong><br><br>Treatment depends on severity:<br><br>&#x2022; <strong>Gingivitis (early):</strong> Improved home care + professional cleaning &mdash; fully reversible<br>&#x2022; <strong>Mild periodontitis:</strong> Scale and polish above and below gum line<br>&#x2022; <strong>Moderate/severe:</strong> Root planing (deep cleaning under local anaesthetic)<br>&#x2022; <strong>Advanced:</strong> Possible referral to a periodontist<br><br>We'll stage your gum disease and create a plan. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Preventing Gum Disease</strong><br><br>The good news: gum disease is almost entirely preventable:<br><br>&#x2022; Brush effectively for 2 minutes twice daily<br>&#x2022; Clean between teeth daily (floss or TePe brushes)<br>&#x2022; Don't smoke &mdash; smoking dramatically increases gum disease risk<br>&#x2022; Eat a balanced diet and limit sugar<br>&#x2022; See your dentist and hygienist regularly<br><br>If you haven't had a hygiene appointment recently, now's the time. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Receding Gums</strong><br><br>Gum recession exposes the root surface of teeth, causing sensitivity and changing your smile:<br><br>&#x2022; Usually caused by gum disease, over-brushing, or grinding<br>&#x2022; Can't fully reverse, but progression can be stopped<br>&#x2022; Exposed roots are more sensitive and more prone to decay<br>&#x2022; Gum grafting (specialist referral) can cover exposed roots in some cases<br>&#x2022; Desensitising toothpaste helps with sensitivity<br><br>Book a gum assessment: "+phoneInline+"."
        ]
    },
    {
        id: 'ulcers',
        priority: 0,
        keywords: ['ulcer','mouth ulcer','mouth sore','canker sore','sore mouth','sore tongue','aphthous','oral ulcer'],
        weight: 4,
        responses: [
            "&#x1F9B7; <strong>Mouth Ulcers</strong><br><br>Most mouth ulcers are harmless and heal within 1&ndash;2 weeks. Common triggers: stress, minor trauma, certain foods.<br><br><strong>Self-care:</strong><br>&#x2022; Antiseptic mouthwash (Corsodyl)<br>&#x2022; Avoid spicy, acidic, or crunchy foods<br>&#x2022; Use a soft toothbrush<br>&#x2022; Bonjela or similar over-the-counter gel<br><br><strong>See us if:</strong> An ulcer lasts <strong>more than 3 weeks</strong>, keeps recurring, or is unusually large or painful. This is important for oral cancer monitoring.<br><br>Call "+phoneInline+" if concerned.",
            "&#x1F9B7; <strong>Dealing with Mouth Ulcers</strong><br><br>&#x2022; Most are minor and heal within 2 weeks without treatment<br>&#x2022; Corsodyl mouthwash speeds healing and prevents infection<br>&#x2022; Bonjela/Anbesol gel provides temporary pain relief<br>&#x2022; Vitamin deficiency (B12, iron, folate) can cause recurring ulcers<br><br><strong>When to see us:</strong> Ulcer lasting 3+ weeks, or you're worried about any sore patch in your mouth. Oral cancer is rare but important to rule out.<br><br>Call "+phoneInline+".",
            "&#x1F9B7; <strong>Mouth Ulcers</strong><br><br>Common, often harmless, but occasionally a sign of something needing attention:<br><br>&#x2022; Use Iglu or Bonjela gel for pain relief<br>&#x2022; Rinse with salt water or Corsodyl<br>&#x2022; Avoid triggers: citrus, spicy food, SLS toothpaste<br>&#x2022; Stress and low immunity make them more likely<br><br>Any ulcer lasting more than 3 weeks needs checking. Book with us: "+phoneInline,
            "&#x1F9B7; <strong>Why Do I Keep Getting Mouth Ulcers?</strong><br><br>Recurring ulcers are common and can have several causes:<br><br>&#x2022; Nutritional deficiencies: iron, vitamin B12, folate<br>&#x2022; Hormonal changes (menstrual cycle)<br>&#x2022; Certain toothpastes containing SLS (sodium lauryl sulphate)<br>&#x2022; Stress and fatigue<br>&#x2022; Immune conditions (Crohn's, coeliac)<br><br>If ulcers recur frequently, mention it at your next check-up. We can rule out underlying causes. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Oral Cancer Awareness</strong><br><br>We screen for oral cancer at every check-up &mdash; it's quick, painless, and potentially life-saving.<br><br><strong>See us promptly if you notice:</strong><br>&#x2022; Any ulcer or sore lasting more than 3 weeks<br>&#x2022; Red or white patches in the mouth<br>&#x2022; Unexplained lump or swelling<br>&#x2022; Difficulty swallowing, or a persistent sore throat<br><br>Risk factors: smoking, heavy alcohol, HPV. Early detection dramatically improves outcomes. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Home Remedies for Mouth Ulcers</strong><br><br>While they heal on their own, these tips reduce discomfort:<br><br>&#x2022; Salt water rinse: 1 tsp salt in a glass of warm water, 3&ndash;4x daily<br>&#x2022; Honey applied directly has antimicrobial properties<br>&#x2022; Bonjela or Anbesol gel for temporary relief<br>&#x2022; Avoid SLS-free toothpaste if you're prone to ulcers (e.g. Sensodyne True White, Squigle)<br>&#x2022; Vitamin B12 supplements can help if deficient<br><br>Persistent? Call "+phoneInline+"."
        ]
    },
    {
        id: 'dry_mouth',
        priority: 0,
        keywords: ['dry mouth','xerostomia','lack of saliva','not enough saliva','cotton mouth','mouth dryness','dry lips','thirsty mouth'],
        weight: 4,
        responses: [
            "&#x1F4A7; <strong>Dry Mouth</strong><br><br>Dry mouth (xerostomia) significantly increases your decay risk as saliva protects teeth.<br><br><strong>Tips:</strong><br>&#x2022; Sip water throughout the day<br>&#x2022; Chew sugar-free gum (stimulates saliva)<br>&#x2022; Avoid caffeine, alcohol, and tobacco<br>&#x2022; Use a dry mouth spray or gel (Biotène)<br>&#x2022; Fluoride toothpaste is even more important<br><br>Common causes: medications, mouth breathing, Sjogren's syndrome. Let us know at your next check-up.",
            "&#x1F4A7; <strong>Dry Mouth (Xerostomia)</strong><br><br>Many common medications cause dry mouth &mdash; antihistamines, antidepressants, blood pressure tablets and more.<br><br>&#x2022; Biotène products (spray, gel, mouthwash) specifically designed for dry mouth<br>&#x2022; Sugar-free pastilles/gum help stimulate saliva<br>&#x2022; Use high-fluoride toothpaste to offset increased decay risk<br>&#x2022; Tell us what medications you take at your check-up<br><br>We can help manage dry mouth &mdash; call "+phoneInline+".",
            "&#x1F4A7; <strong>Dealing with Dry Mouth</strong><br><br>&#x2022; Drink water regularly throughout the day<br>&#x2022; Avoid alcohol, caffeine, and tobacco<br>&#x2022; Breathe through your nose where possible<br>&#x2022; Use Biotène spray or gel<br>&#x2022; Book regular hygiene visits &mdash; you're higher risk for decay<br><br>If dry mouth is affecting your quality of life, mention it at your next appointment and we can advise further.",
            "&#x1F4A7; <strong>What Causes Dry Mouth?</strong><br><br>Dry mouth (xerostomia) is very common and usually medication-related:<br><br>&#x2022; Antihistamines, antidepressants, blood pressure tablets<br>&#x2022; Anxiety and stress<br>&#x2022; Mouth breathing (especially at night)<br>&#x2022; Sjogren's syndrome or other autoimmune conditions<br>&#x2022; Radiation therapy to the head/neck<br>&#x2022; Dehydration<br><br>Tell us about all your medications so we can tailor your dental care. Call "+phoneInline+".",
            "&#x1F4A7; <strong>Dry Mouth &amp; Decay Risk</strong><br><br>Saliva is your mouth's natural defence against decay. Without enough of it:<br><br>&#x2022; Bacteria are not neutralised and acid is not washed away<br>&#x2022; Decay risk rises significantly<br>&#x2022; Root surfaces are particularly vulnerable<br>&#x2022; More frequent check-ups may be recommended<br><br><strong>Protective steps:</strong> High-fluoride toothpaste, xylitol products, Biotène, more frequent hygiene visits. Ask us for personalised advice. "+phoneInline,
            "&#x1F4A7; <strong>Products for Dry Mouth</strong><br><br>These over-the-counter products can help:<br><br>&#x2022; <strong>Biotène Oral Balance Gel:</strong> Apply to gums at night<br>&#x2022; <strong>Biotène Moisturising Spray:</strong> Use throughout the day<br>&#x2022; <strong>Biotène Mouthwash:</strong> Alcohol-free, won't dry further<br>&#x2022; <strong>Xylimelts:</strong> Adhering discs that stimulate saliva overnight<br>&#x2022; <strong>GC Dry Mouth Gel:</strong> Another well-regarded option<br><br>We can also prescribe high-fluoride toothpaste. Ask at your next visit."
        ]
    },
    {
        id: 'crooked_teeth',
        priority: 0,
        keywords: ['crooked teeth','misaligned','overcrowded','overcrowding','crossbite','overbite','underbite','gap teeth','gapped teeth','spaced teeth','teeth gap','teeth space'],
        weight: 4,
        responses: [
            "&#x1F9B7; <strong>Crooked or Misaligned Teeth</strong><br><br>Crooked or crowded teeth are very common and can affect both your bite and oral hygiene.<br><br>We don't offer orthodontic treatment (braces/Invisalign) at our practice, but your dentist can assess your teeth during a check-up and refer you to a specialist orthodontist if needed.<br><br>Call "+phoneInline+" to book an assessment.",
            "&#x1F9B7; <strong>Crooked Teeth?</strong><br><br>It's more common than you think! Crooked or crowded teeth aren't just an appearance issue &mdash; they're harder to clean and can affect your bite.<br><br>While we don't offer braces or Invisalign, we can assess your teeth and arrange a referral to an orthodontic specialist. Call "+phoneInline+" to book a check-up.",
            "&#x1F9B7; <strong>Crooked Teeth &amp; Oral Hygiene</strong><br><br>Misaligned teeth create areas that are harder to clean, increasing the risk of decay and gum disease:<br><br>&#x2022; Use TePe interdental brushes in all gaps<br>&#x2022; A water flosser (Waterpik) can help reach tricky areas<br>&#x2022; Regular hygiene visits are especially important<br>&#x2022; Your hygienist can identify problem spots and advise on technique<br><br>We can refer you to an orthodontist if straightening is appropriate. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Gaps Between Teeth</strong><br><br>Gaps (diastema) between teeth are usually harmless but can catch food and affect appearance:<br><br>&#x2022; Clean the gap thoroughly with floss or TePe brushes<br>&#x2022; A gap from a missing tooth should be discussed with us (bridge or denture options)<br>&#x2022; Cosmetic gap closure with bonding or veneers isn't our focus, but orthodontic referral is possible<br><br>Book a check-up to discuss: "+phoneInline,
            "&#x1F9B7; <strong>Does Crowding Affect My Dental Health?</strong><br><br>Crowded or overlapping teeth are associated with higher risks:<br><br>&#x2022; More decay between teeth (harder to clean between)<br>&#x2022; Higher gum disease risk (plaque builds up faster)<br>&#x2022; Bite issues can cause wear and jaw pain<br><br>Even if you choose not to pursue orthodontics, extra vigilance with cleaning is essential. Your hygienist can help. Call "+phoneInline+"."
        ]
    },
    {
        id: 'chipped_tooth',
        priority: 0,
        keywords: ['chipped tooth','chipped teeth','chip','broken tooth','cracked tooth','fractured tooth','knocked tooth','damaged tooth'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Chipped or Broken Tooth</strong><br><br>Don't worry &mdash; we can almost certainly fix it! Options include:<br><br>&#x2022; <strong>Filling:</strong> Quick repair for small chips<br>&#x2022; <strong>Crown:</strong> For significant damage or cracks<br>&#x2022; <strong>Root canal + crown:</strong> If the nerve is affected<br><br>Save any broken pieces if possible. Rinse gently with water. Call "+phoneInline+" to book.",
            "&#x1F9B7; <strong>Chipped a Tooth?</strong><br><br>We see chipped teeth regularly &mdash; usually a straightforward fix:<br><br>&#x2022; Small chip: filling (tooth-coloured, done in one visit)<br>&#x2022; Larger chip or crack: dental crown<br>&#x2022; Large break with pain: may need root canal first, then crown<br><br>Even if it doesn't hurt, get it checked &mdash; sharp edges can cut your tongue and the tooth may be at risk. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Broken or Chipped Tooth</strong><br><br>&#x2022; Rinse gently with warm water<br>&#x2022; Save any pieces (wrap in damp cloth)<br>&#x2022; Take paracetamol if painful<br>&#x2022; Call "+phoneInline+" &mdash; we'll try to see you promptly<br><br>Treatment options: filling or crown depending on size. Most chips are fixed in a single visit.",
            "&#x1F9B7; <strong>Why Do Teeth Chip?</strong><br><br>Common causes of chipped teeth:<br><br>&#x2022; Biting hard foods (ice, hard sweets, nuts)<br>&#x2022; Trauma or impact injury<br>&#x2022; Teeth grinding (bruxism) wearing enamel thin<br>&#x2022; Large old fillings weakening the surrounding tooth<br>&#x2022; Acid erosion softening enamel<br><br>Once chipped, teeth won't repair themselves. Book an appointment &mdash; the fix is usually quick and straightforward. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Cracked Tooth Syndrome</strong><br><br>Not all cracks are visible. Signs of a cracked tooth:<br><br>&#x2022; Sharp pain when biting down<br>&#x2022; Pain that disappears immediately when you stop biting<br>&#x2022; Sensitivity to cold that lingers<br>&#x2022; Difficulty identifying exactly which tooth hurts<br><br>Cracked teeth can be tricky to diagnose &mdash; we may use special staining dye or biting tests. Call "+phoneInline+" if any of these sound familiar.",
            "&#x1F9B7; <strong>Emergency Chipped Tooth</strong><br><br>Don't panic! Here's what to do right now:<br><br>&#x2022; Rinse your mouth with warm salt water<br>&#x2022; Save any fragments in milk or saliva (not water)<br>&#x2022; If sharp and cutting your tongue, a little dental wax (from a pharmacist) can protect it temporarily<br>&#x2022; Take paracetamol or ibuprofen for pain<br>&#x2022; Call "+phoneInline+" and we'll aim to see you quickly<br><br>We treat chipped teeth as urgent appointments."
        ]
    },
    {
        id: 'loose_tooth',
        priority: 0,
        keywords: ['loose tooth','wobbly tooth','tooth moving','moving tooth','loose adult tooth','teeth loosening','loose teeth'],
        weight: 5,
        responses: [
            "&#x26A0;&#xFE0F; <strong>Loose Adult Tooth</strong><br><br>A loose adult tooth always needs prompt attention. Possible causes:<br><br>&#x2022; <strong>Gum disease</strong> (most common) &mdash; bone loss around the root<br>&#x2022; <strong>Trauma</strong> &mdash; injury loosening the tooth<br>&#x2022; <strong>Grinding</strong> &mdash; excessive force over time<br>&#x2022; <strong>Infection</strong> &mdash; abscess destroying supporting bone<br><br>Early treatment can often save the tooth. Please call "+phone+" soon for an assessment.",
            "&#x26A0;&#xFE0F; <strong>Don't Ignore a Loose Tooth</strong><br><br>Adult teeth don't loosen without cause. The sooner we investigate, the better the outcome.<br><br>Gum disease is the most common reason, and advanced gum disease is treatable even if not reversible. We can stop progression and stabilise remaining teeth.<br><br>Please call "+phone+" promptly.",
            "&#x26A0;&#xFE0F; A loose adult tooth needs to be seen soon. Please call "+phone+". We'll take X-rays, diagnose the cause, and recommend treatment. The sooner the better!",
            "&#x26A0;&#xFE0F; <strong>Loose Tooth After an Injury?</strong><br><br>If a tooth has been loosened by trauma:<br><br>&#x2022; Try not to move it with your tongue<br>&#x2022; Stick to soft foods<br>&#x2022; Avoid hard or crunchy foods on that side<br>&#x2022; Call "+phoneInline+" the same day if possible<br><br>A trauma-loosened tooth may tighten and re-attach over time if stabilised promptly. The sooner we assess it, the better the chance of saving it.",
            "&#x26A0;&#xFE0F; <strong>Loose Tooth from Gum Disease</strong><br><br>When gum disease destroys the bone supporting a tooth, it begins to loosen. The stages:<br><br>&#x2022; Early: slight wobble, gums bleed, bad breath<br>&#x2022; Moderate: more movement, pain on chewing<br>&#x2022; Severe: tooth may need to be removed<br><br>Early intervention (deep cleaning, root planing) can often stabilise teeth. Please don't wait &mdash; call "+phoneInline+" now.",
            "&#x26A0;&#xFE0F; <strong>Can a Loose Tooth Be Saved?</strong><br><br>Often yes, depending on the cause and how quickly you act:<br><br>&#x2022; Gum disease: deep cleaning can stop progression and sometimes stabilise the tooth<br>&#x2022; Trauma: splinting (bonding the tooth to neighbours) allows healing<br>&#x2022; Abscess: antibiotics and drainage, then assessment<br><br>The later you leave it, the fewer options available. Call "+phoneInline+" as soon as possible."
        ]
    },
    {
        id: 'sensitivity',
        priority: 0,
        keywords: ['sensitive teeth','tooth sensitivity','sensitive to cold','cold sensitivity','sensitivity','sensitiv','hot cold pain','teeth sensitive','sensitive to hot','sensitive when eating','ice cream tooth','sensitive tooth','tingly teeth','teeth tingling','dental sensitivity'],
        weight: 6,
        responses: [
            "&#x1F9CA; <strong>Tooth Sensitivity</strong><br><br>Sensitivity is very common and usually very treatable.<br><br><strong>Common causes:</strong><br>&#x2022; Worn enamel (from acidic diet or grinding)<br>&#x2022; Exposed dentine (gum recession, over-brushing)<br>&#x2022; Decay or cracked tooth<br>&#x2022; Teeth bleaching (temporary)<br><br><strong>Self-help:</strong><br>&#x2022; Sensodyne or other desensitising toothpaste &mdash; apply directly to sensitive spot<br>&#x2022; Soft toothbrush, gentle technique<br>&#x2022; Avoid acidic foods/drinks<br>&#x2022; Wait 30 min after eating before brushing<br><br>If sensitivity is sudden or severe, book a check-up: "+phoneInline,
            "&#x1F9CA; <strong>Sensitive Teeth</strong><br><br>&#x2022; Use Sensodyne or similar for 2+ weeks and see if it helps<br>&#x2022; Apply a blob of desensitising toothpaste to the sensitive tooth and leave it on at night<br>&#x2022; Avoid acidic drinks (citrus juice, fizzy drinks)<br>&#x2022; Sip with a straw to reduce acid contact<br><br>If sensitivity is on one specific tooth or appeared suddenly, it could be a cavity or crack &mdash; book a check-up: "+phoneInline+".",
            "&#x1F9CA; <strong>Managing Tooth Sensitivity</strong><br><br>Sensitivity to hot, cold, or sweet usually means dentine is exposed:<br><br>&#x2022; Sensodyne (potassium nitrate) or Pronamel toothpaste<br>&#x2022; Use as directed &mdash; take several weeks to work<br>&#x2022; Professional fluoride varnish can help seal dentine<br>&#x2022; If sensitivity is getting worse or is localised to one tooth: book a check-up<br><br>Call "+phoneInline+" and we'll help.",
            "&#x1F9CA; <strong>Why Are My Teeth Suddenly Sensitive?</strong><br><br>Sudden sensitivity is worth investigating promptly:<br><br>&#x2022; New sensitivity on one specific tooth = could be decay, crack, or exposed root<br>&#x2022; Sensitivity after a filling = usually settles within 2&ndash;6 weeks<br>&#x2022; Sensitivity after whitening = temporary, resolves within days<br>&#x2022; Generalised sensitivity = likely enamel erosion or gum recession<br><br>If you're unsure, the safest step is a check-up. Call "+phoneInline+".",
            "&#x1F9CA; <strong>Sensitivity After a Filling</strong><br><br>It's very common to experience sensitivity for a few weeks after a filling:<br><br>&#x2022; The tooth needs time to settle after treatment<br>&#x2022; Use desensitising toothpaste in the meantime<br>&#x2022; Avoid very hot, cold, sweet, or acidic foods temporarily<br>&#x2022; If the bite feels high or if sensitivity worsens after 3 weeks: call us for a review<br><br>This is almost always temporary. Don't worry &mdash; call "+phoneInline+" if concerned.",
            "&#x1F9CA; <strong>Best Toothpaste for Sensitive Teeth</strong><br><br>Not all sensitivity toothpastes work the same way:<br><br>&#x2022; <strong>Sensodyne Rapid Relief:</strong> Works fastest (active ingredient: stannous fluoride)<br>&#x2022; <strong>Sensodyne Repair &amp; Protect:</strong> Builds a protective layer over time<br>&#x2022; <strong>Colgate Sensitive Pro-Relief:</strong> Plugs open dentine tubules<br>&#x2022; <strong>Pronamel:</strong> Best if sensitivity is due to acid erosion<br><br>Try one for 4&ndash;6 weeks consistently. If no improvement, come and see us. "+phoneInline,
            "&#x1F9CA; <strong>Professional Treatments for Sensitivity</strong><br><br>If over-the-counter products aren't enough, we can help:<br><br>&#x2022; <strong>Fluoride varnish:</strong> Applied in-chair, strengthens and seals exposed dentine<br>&#x2022; <strong>Dentine bonding:</strong> Seals exposed root surfaces with tooth-coloured material<br>&#x2022; <strong>Gum grafting:</strong> Specialist procedure to cover exposed roots (referral)<br>&#x2022; <strong>Prescription fluoride toothpaste:</strong> Much higher concentration than OTC<br><br>Book an appointment to discuss your options: "+phoneInline
        ]
    },
    {
        id: 'bad_breath',
        priority: 0,
        keywords: ['bad breath','breath smell','halitosis','smelly breath','odour mouth','stinky breath','breath problem','morning breath','chronic bad breath'],
        weight: 4,
        responses: [
            "&#x1F4A8; <strong>Bad Breath (Halitosis)</strong><br><br><strong>Most common causes:</strong><br>&#x2022; Plaque and bacteria on teeth and tongue<br>&#x2022; Gum disease<br>&#x2022; Dry mouth<br>&#x2022; Strong foods (garlic, onions)<br>&#x2022; Certain medications<br><br><strong>Effective tips:</strong><br>&#x2022; Brush teeth AND tongue twice daily<br>&#x2022; Floss daily<br>&#x2022; Stay well hydrated<br>&#x2022; Chew sugar-free gum after meals<br>&#x2022; Use mouthwash at a different time to brushing<br>&#x2022; Regular hygiene visits<br><br>Persistent bad breath despite good hygiene may indicate gum disease. Book: "+phoneInline,
            "&#x1F4A8; <strong>Dealing with Bad Breath</strong><br><br>&#x2022; 90% of bad breath originates in the mouth (not stomach)<br>&#x2022; Your tongue is a major source &mdash; brush or scrape it daily<br>&#x2022; Gum disease produces very strong odour &mdash; see us if gums bleed<br>&#x2022; Dry mouth contributes &mdash; stay hydrated<br>&#x2022; Good oral hygiene + regular hygiene visits solves most cases<br><br>Book a hygiene appointment: "+phoneInline+".",
            "&#x1F4A8; <strong>Bad Breath?</strong><br><br>Here's an honest assessment:<br><br>&#x2022; If you have good oral hygiene but still have bad breath &mdash; book a check-up (could be gum disease)<br>&#x2022; If your hygiene isn't great &mdash; step up brushing, flossing, tongue cleaning<br>&#x2022; Use Corsodyl mouthwash for gum issues (short-term)<br>&#x2022; Chewing parsley or using activated charcoal products may help temporarily<br><br>Long-term fix: excellent hygiene + regular hygiene visits. Call "+phoneInline+".",
            "&#x1F4A8; <strong>Quick Bad Breath Checklist</strong><br><br>Run through this checklist honestly:<br><br>&#x2714; Brushing twice a day for 2 minutes?<br>&#x2714; Cleaning between teeth daily?<br>&#x2714; Brushing your tongue?<br>&#x2714; Staying well hydrated?<br>&#x2714; Regular hygiene appointments?<br>&#x2714; Not a smoker?<br><br>If you ticked all boxes but still struggle with bad breath, the culprit is likely gum disease or tonsil stones. Book a check-up: "+phoneInline,
            "&#x1F4A8; <strong>Bad Breath at Night / Morning</strong><br><br>Morning breath is normal &mdash; saliva dries up overnight and bacteria multiply. Persistent through the day suggests a problem.<br><br>Tips to reduce morning breath:<br>&#x2022; Brush and floss thoroughly before bed<br>&#x2022; Scrape or brush your tongue last thing at night<br>&#x2022; Use an alcohol-free mouthwash before sleep<br>&#x2022; Stay hydrated and breathe through your nose<br>&#x2022; A dry-mouth gel at bedtime helps if your mouth dries out<br><br>Concerns? Call "+phoneInline+".",
            "&#x1F4A8; <strong>Can the Dentist Fix Bad Breath?</strong><br><br>Absolutely &mdash; and we do it regularly!<br><br>&#x2022; Professional hygiene removes the bacteria causing odour<br>&#x2022; Treating gum disease eliminates one of the biggest causes<br>&#x2022; We can identify cavities or old fillings harbouring bacteria<br>&#x2022; We'll give you a personalised routine that actually works<br>&#x2022; Hygiene + check-up = NHS Band 1 (&#163;27.40)<br><br>Don't suffer in silence &mdash; call "+phoneInline+" and let us help."
        ]
    },

    // ════════════════════════════════════════
    // CHILDREN
    // ════════════════════════════════════════
    {
        id: 'children',
        priority: 0,
        keywords: ['child','children','kid','kids','baby','toddler','infant','son','daughter','little one','young child','first tooth','teething','milk teeth','baby teeth','child dentist','paediatric','kids dentist','family dentist','bring child'],
        weight: 5,
        responses: [
            "&#x1F476; <strong>Children's Dentistry</strong><br><br>&#x2022; <strong>First visit:</strong> As soon as the first tooth appears, or around age 1<br>&#x2022; <strong>Free NHS</strong> treatment for all children under 18<br>&#x2022; Gentle, friendly team experienced with all ages<br>&#x2022; Preventive focus: fluoride, sealants, diet advice<br>&#x2022; We make dental visits fun and stress-free!<br><br><strong>Teething tips:</strong><br>&#x2022; Cool (not frozen) teething ring<br>&#x2022; Clean finger massage on gums<br>&#x2022; Sugar-free teething gel (ask pharmacist)<br><br>Register your child: "+phoneInline,
            "&#x1F476; <strong>Family &amp; Children's Dentistry</strong><br><br>We love treating children &mdash; the earlier you start, the better their dental habits for life!<br><br>&#x2022; Free NHS care for under-18s<br>&#x2022; First visit at 1 year or when first teeth arrive<br>&#x2022; We use child-friendly language and take our time<br>&#x2022; No white coats, no scary words &mdash; just friendly faces<br>&#x2022; Fluoride varnish and sealants for cavity prevention<br><br>Call "+phoneInline+" to register your child.",
            "&#x1F476; <strong>Bringing Your Child to the Dentist</strong><br><br>&#x2022; First appointment ideally by age 1<br>&#x2022; The earlier you start, the more comfortable they become<br>&#x2022; Children's NHS treatment is completely free<br>&#x2022; We offer stickers and praise &mdash; we make it positive!<br>&#x2022; Siblings welcome to watch so they get used to it<br><br>Start building great habits early! Call "+phoneInline+" to register.",
            "&#x1F476; <strong>Children's Dental Care Tips for Parents</strong><br><br>Help your child build great habits from the start:<br><br>&#x2022; Start brushing as soon as the first tooth appears<br>&#x2022; Use a soft children's toothbrush and pea-sized amount of fluoride toothpaste<br>&#x2022; Brush for them until they're 7, then supervise until 10<br>&#x2022; Limit sugary drinks &mdash; no fruit juice in bottles<br>&#x2022; Don't dip dummies in sugar or honey<br>&#x2022; Book their first check-up by age 1<br><br>Register your child: "+phoneInline,
            "&#x1F476; <strong>Teething &mdash; How to Help Your Baby</strong><br><br>Teething usually starts at 4&ndash;7 months and continues until age 3:<br><br>&#x2022; Cool (not frozen) teething ring<br>&#x2022; Clean finger massage on gums<br>&#x2022; Sugar-free teething gel (check the age recommendation on packaging)<br>&#x2022; Paracetamol or ibuprofen if they seem in pain (check dosage for age)<br>&#x2022; Extra cuddles &mdash; it's uncomfortable for them!<br><br>Book your baby's first dental visit soon after the first tooth arrives. "+phoneInline,
            "&#x1F476; <strong>Is My Child's Dental Treatment Free?</strong><br><br>Yes &mdash; all NHS dental treatment is completely free for children under 18:<br><br>&#x2022; Check-ups<br>&#x2022; Fillings<br>&#x2022; Extractions<br>&#x2022; X-rays<br>&#x2022; Fluoride varnish<br>&#x2022; Fissure sealants<br>&#x2022; Emergency care<br><br>No charges whatsoever. Just register and bring them in! Call "+phoneInline+" to register your child.",
            "&#x1F476; <strong>My Child Is Scared of the Dentist</strong><br><br>Dental anxiety in children is very common &mdash; we're specialists at helping nervous young patients:<br><br>&#x2022; We never rush a nervous child<br>&#x2022; We use 'tell-show-do' &mdash; explaining and demonstrating before anything happens<br>&#x2022; First visits can simply be a look around and a sit in the chair<br>&#x2022; Bringing a favourite toy helps<br>&#x2022; The more they come, the more relaxed they become<br><br>Call "+phoneInline+" and mention your child is nervous &mdash; we'll plan accordingly.",
            "&#x1F476; <strong>Children's Teeth &mdash; Frequently Asked Questions</strong><br><br><strong>Q: When do baby teeth fall out?</strong> From age 5&ndash;6, usually complete by 12&ndash;13.<br><strong>Q: Does my child need baby teeth filled?</strong> Yes &mdash; infected baby teeth cause pain and can damage adult teeth beneath.<br><strong>Q: When should we start orthodontic assessment?</strong> Around age 10&ndash;12, once most adult teeth are present.<br><strong>Q: Is it normal for adult teeth to look bigger/yellower?</strong> Yes &mdash; adult teeth are naturally larger and slightly more yellow than baby teeth.<br><br>Questions? Call "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // NERVOUS PATIENTS
    // ════════════════════════════════════════
    {
        id: 'nervous',
        priority: 0,
        keywords: ['nervous','scared','anxiety','afraid','anxious','phobia','dental fear','worried','panic','dread','hate dentist','terrified','frightened','dental anxiety','fear of dentist','can\'t face dentist','put off dentist','avoiding dentist'],
        weight: 6,
        responses: [
            "&#x1F49A; <strong>Nervous Patient Care</strong><br><br>You're not alone &mdash; dental anxiety is incredibly common, and we truly understand.<br><br>Our approach for anxious patients:<br>&#x2022; <strong>Your pace, always</strong> &mdash; no rushing, ever<br>&#x2022; <strong>Full explanation</strong> of every step before we begin<br>&#x2022; <strong>Stop signal</strong> &mdash; raise your hand and everything stops immediately<br>&#x2022; <strong>Breaks</strong> whenever you need them<br>&#x2022; <strong>Dr Kaushal</strong> is experienced and compassionate with anxious patients<br>&#x2022; <strong>Sedation options</strong> available for severe anxiety<br><br>The first step is just calling us. We'll look after you. "+phoneInline+" &#x1F49A;",
            "&#x1F49A; <strong>We Understand Dental Anxiety</strong><br><br>Many of our most nervous patients become our most loyal ones, once they realise how different we are.<br><br>&#x2022; Tell us about your anxiety when you call &mdash; we'll note it and prepare<br>&#x2022; First appointment can just be a chat &mdash; no treatment if you're not ready<br>&#x2022; We use numbing gel before any injection<br>&#x2022; You're in control at all times<br>&#x2022; Sedation available for those who need it<br><br>Please don't let fear hold you back from essential care. Call "+phoneInline+".",
            "&#x1F49A; <strong>Dental Phobia</strong><br><br>Dental fear is real and we take it seriously. Here's what we promise:<br><br>&#x2022; Never judge you or rush you<br>&#x2022; Agree a signal to stop whenever you want<br>&#x2022; Numbing gel before any injection (you won't feel it)<br>&#x2022; Explain everything before touching anything<br>&#x2022; Let you listen to music or use headphones<br>&#x2022; Sedation options for severe cases<br><br>You deserve good dental care regardless of your anxiety. Please call "+phoneInline+" &mdash; we're here for you.",
            "&#x1F49A; <strong>Tips for Nervous Dental Patients</strong><br><br>These practical strategies genuinely help:<br><br>&#x2022; Book the first appointment of the day so you don't spend hours dreading it<br>&#x2022; Bring a friend for support<br>&#x2022; Listen to calming music through headphones during treatment<br>&#x2022; Practice slow, deep breathing in the chair<br>&#x2022; Tell us at any time if you need a break<br>&#x2022; Focus on the fact that discomfort is temporary &mdash; the results last years<br><br>We want to help you. Call "+phoneInline+".",
            "&#x1F49A; <strong>How Long Before I Feel Comfortable?</strong><br><br>Most nervous patients find that after 2&ndash;3 visits, their anxiety reduces significantly:<br><br>&#x2022; First visit: sometimes just a chat with no treatment<br>&#x2022; Second visit: a look around, X-rays, hygiene<br>&#x2022; Third visit: simple treatment, building trust<br><br>There's no rush. We work at your pace, always. Regular attendance actually reduces anxiety far better than avoiding the dentist. Call "+phoneInline+" to take the first step.",
            "&#x1F49A; <strong>Sedation Options for Nervous Patients</strong><br><br>For those with severe dental phobia:<br><br>&#x2022; <strong>Relative analgesia (nitrous oxide / 'happy gas'):</strong> Inhaled sedation, keeps you conscious but deeply relaxed<br>&#x2022; <strong>Oral sedation:</strong> Tablet taken before treatment<br>&#x2022; <strong>IV sedation:</strong> Administered by a specialist, for complex cases<br><br>Discuss options with us when you call "+phoneInline+". We'll find an approach that works for you.",
            "&#x1F49A; <strong>Coming Back After Years Away</strong><br><br>If you've avoided the dentist for years due to anxiety &mdash; you are not alone, and we won't judge you.<br><br>&#x2022; We see patients who haven't attended in 5, 10, even 20 years<br>&#x2022; The first check-up is always just an assessment &mdash; no surprise treatment<br>&#x2022; We'll create a plan together and tackle things in a manageable order<br>&#x2022; Whatever the state of your teeth, we can help<br><br>Reaching out is the hardest part. Call "+phoneInline+" today &mdash; you'll be glad you did.",
            "&#x1F49A; <strong>Children's Dental Anxiety</strong><br><br>If your child is nervous about the dentist, we can help:<br><br>&#x2022; We specialise in gentle, child-friendly approaches<br>&#x2022; We introduce the chair, tools, and sounds gradually<br>&#x2022; Never force anything &mdash; always at the child's pace<br>&#x2022; First visits can simply be a sit in the chair and a sticker<br>&#x2022; The earlier they start attending, the less anxious they become<br><br>Mention your child's nervousness when calling: "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // PREGNANCY & MEDICAL
    // ════════════════════════════════════════
    {
        id: 'pregnancy',
        priority: 0,
        keywords: ['pregnant','pregnancy','expecting','maternity','prenatal','antenatal','baby bump','while pregnant','dental while pregnant'],
        weight: 5,
        responses: [
            "&#x1F930; <strong>Dental Care During Pregnancy</strong><br><br>Good news &mdash; dental treatment is completely safe during pregnancy!<br><br>&#x2022; <strong>NHS treatment is FREE</strong> during pregnancy and for 12 months after birth<br>&#x2022; Apply for a <strong>Maternity Exemption Certificate (MatEx)</strong> via your midwife or GP<br>&#x2022; Hormonal changes increase gum disease risk &mdash; extra hygiene visits recommended<br>&#x2022; Morning sickness acid can erode enamel &mdash; rinse with water after vomiting, wait 30 min to brush<br>&#x2022; X-rays can be taken if essential (minimal radiation, leaded apron provided)<br><br>Don't neglect your teeth while pregnant! Call "+phoneInline+".",
            "&#x1F930; <strong>Pregnant? Here's What to Know</strong><br><br>&#x2022; Dental treatment is safe at all stages of pregnancy<br>&#x2022; Your NHS dental care is <strong>completely free</strong> during pregnancy and 12 months postpartum<br>&#x2022; Pregnancy gingivitis is very common &mdash; gums may bleed more<br>&#x2022; Increase brushing and flossing; book an extra hygiene appointment<br>&#x2022; Tell us when you call so we can take any extra precautions<br><br>Call "+phoneInline+" and mention your pregnancy.",
            "&#x1F930; <strong>Dental Health in Pregnancy</strong><br><br>Your oral health affects your baby's health too &mdash; gum disease is linked to premature birth and low birth weight.<br><br>&#x2022; Free NHS dental care &mdash; get your MatEx certificate<br>&#x2022; Keep up check-ups and hygiene visits<br>&#x2022; Use a softer brush if gums are sore<br>&#x2022; Stay hydrated and maintain a good diet<br><br>We'll make every appointment as comfortable as possible. Call "+phoneInline+".",
            "&#x1F930; <strong>Pregnancy Gingivitis</strong><br><br>Hormonal changes during pregnancy make your gums more sensitive to plaque, leading to pregnancy gingivitis:<br><br>&#x2022; Gums may bleed more easily when brushing<br>&#x2022; Keep brushing &mdash; stopping makes it worse<br>&#x2022; Book an extra hygiene appointment in the second trimester<br>&#x2022; Floss daily and use a fluoride mouthwash at a different time to brushing<br>&#x2022; All free on NHS during pregnancy<br><br>Call "+phoneInline+" and mention your pregnancy.",
            "&#x1F930; <strong>Morning Sickness &amp; Your Teeth</strong><br><br>Frequent vomiting exposes teeth to stomach acid &mdash; protect your enamel:<br><br>&#x2022; Rinse with water immediately after vomiting<br>&#x2022; Wait <strong>30 minutes</strong> before brushing &mdash; brushing immediately spreads acid into softened enamel<br>&#x2022; Use a fluoride toothpaste and consider a fluoride rinse<br>&#x2022; Neutralise acid by chewing sugar-free gum<br><br>This is especially important in the first trimester. Let us know at your appointment. "+phoneInline,
            "&#x1F930; <strong>Getting Your Free Maternity Exemption Certificate</strong><br><br>You're entitled to free NHS dental treatment during pregnancy and 12 months after birth:<br><br>1. Ask your midwife or GP for a Maternity Exemption Certificate (FW8 form) or apply online via NHSBSA<br>2. You'll receive a MatEx card<br>3. Present it at every dental appointment to receive free treatment<br><br>This covers check-ups, fillings, extractions, and more &mdash; all completely free. Call "+phoneInline+" to book."
        ]
    },
    {
        id: 'diabetes',
        priority: 0,
        keywords: ['diabetes','diabetic','type 1','type 2','blood sugar','insulin','diabetes and teeth','diabetes dental'],
        weight: 4,
        responses: [
            "&#x1F9B7; <strong>Diabetes &amp; Dental Health</strong><br><br>Diabetes and gum disease are closely linked in both directions:<br><br>&#x2022; Diabetics are at higher risk of gum disease and infection<br>&#x2022; Gum disease can make blood sugar harder to control<br>&#x2022; Healing after extractions or surgery may be slower<br>&#x2022; Dry mouth is common, increasing decay risk<br>&#x2022; More frequent check-ups (every 3&ndash;6 months) may be recommended<br><br>Always tell us about your diabetes and medications. We'll tailor your care accordingly. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Managing Dental Health with Diabetes</strong><br><br>&#x2022; Tell us your blood sugar control and medications<br>&#x2022; Avoid dental appointments when blood sugar is very low<br>&#x2022; Bring a snack in case your appointment runs long<br>&#x2022; Excellent oral hygiene is especially important<br>&#x2022; Regular hygiene visits every 3&ndash;6 months<br>&#x2022; If you have an infection, we'll prescribe antibiotics promptly<br><br>Call "+phoneInline+" and let us know about your diabetes.",
            "&#x1F9B7; <strong>Diabetes &amp; Your Teeth</strong><br><br>There's a well-established link between gum disease and blood sugar control:<br><br>&#x2022; Good gum health can help improve HbA1c levels<br>&#x2022; Diabetics heal more slowly &mdash; we plan treatment accordingly<br>&#x2022; Dry mouth (common with diabetes) increases cavity risk<br>&#x2022; We can issue antibiotic cover if required<br><br>Always disclose your diabetes status when you register or attend. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Blood Sugar &amp; Dental Appointments</strong><br><br>A few practical tips for diabetic patients visiting us:<br><br>&#x2022; Don't skip meals before a dental appointment<br>&#x2022; Bring a glucose snack or tablet in case treatment runs long<br>&#x2022; Tell us your current blood sugar management and if you're on insulin<br>&#x2022; Morning appointments are generally better (blood sugar more stable)<br>&#x2022; Carry your diabetes ID card<br><br>We'll keep appointments to schedule and check in on you throughout. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Diabetes &mdash; Dental Check-up Frequency</strong><br><br>If you have diabetes, more frequent dental visits are often recommended:<br><br>&#x2022; Well-controlled diabetes: check-up every 6 months<br>&#x2022; Poorly controlled diabetes: every 3&ndash;4 months<br>&#x2022; Gum disease present: hygiene visits every 3 months<br><br>This is because diabetics are at significantly higher risk of gum disease progression and slower healing. All NHS &mdash; no extra charge for more frequent visits. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Dental Abscesses in Diabetic Patients</strong><br><br>Diabetics are more prone to dental infections, and infections can destabilise blood sugar levels:<br><br>&#x2022; A dental abscess in a diabetic patient requires urgent treatment<br>&#x2022; Antibiotics and drainage are usually prescribed promptly<br>&#x2022; Blood sugar may spike during infection &mdash; monitor closely<br>&#x2022; Let your GP know if you have a significant dental infection<br><br>Call "+phoneInline+" immediately if you suspect a dental abscess."
        ]
    },
    {
        id: 'medical_history',
        priority: 0,
        keywords: ['medical history','medication','blood thinner','warfarin','rivaroxaban','heart condition','allergy','allergic','asthma','epilepsy','medical condition','health condition','medications list','what to tell dentist'],
        weight: 4,
        responses: [
            "&#x1F4CB; <strong>Your Medical History</strong><br><br>It's essential we know about your health for safe treatment. Please always tell us about:<br><br>&#x2022; All medications (including herbal supplements)<br>&#x2022; Blood thinners (warfarin, aspirin, rivaroxaban, etc.)<br>&#x2022; Allergies (especially to latex, anaesthetics, or penicillin)<br>&#x2022; Heart conditions, pacemakers, artificial valves or joints<br>&#x2022; Diabetes, epilepsy, asthma, or any other condition<br>&#x2022; Recent hospital treatment or surgery<br><br>You can update your medical history at any appointment.",
            "&#x1F4CB; <strong>Medical History &amp; Medications</strong><br><br>Your safety is our priority &mdash; please tell us everything relevant:<br><br>&#x2022; Any conditions affecting healing or bleeding<br>&#x2022; Blood thinners, steroids, bisphosphonates<br>&#x2022; Allergies (latex, anaesthetics, medications)<br>&#x2022; Pacemakers or implanted devices<br>&#x2022; If anything changes between visits, tell us at your next appointment<br><br>Everything is kept confidential. Call "+phoneInline+" if you have specific concerns.",
            "&#x1F4CB; <strong>Updating Your Medical History</strong><br><br>New medication? New diagnosis? Please let us know at your next visit or call "+phoneInline+".<br><br>Common things that affect dental treatment:<br>&#x2022; Blood thinners &mdash; may need cover for extractions<br>&#x2022; Bisphosphonates &mdash; affects healing after extractions<br>&#x2022; Latex allergy &mdash; we'll use latex-free gloves<br>&#x2022; Penicillin allergy &mdash; affects antibiotic choice<br><br>Never hesitate to disclose &mdash; it helps us keep you safe.",
            "&#x1F4CB; <strong>Blood Thinners &amp; Dental Treatment</strong><br><br>If you take blood thinners (warfarin, rivaroxaban, apixaban, aspirin), tell us before any treatment:<br><br>&#x2022; Extractions can cause prolonged bleeding without management<br>&#x2022; We may need to coordinate with your GP or haematologist<br>&#x2022; We do NOT automatically tell you to stop your blood thinners &mdash; always consult your prescriber<br>&#x2022; We use haemostatic materials to minimise bleeding during extractions<br><br>Call "+phoneInline+" and let us know at booking.",
            "&#x1F4CB; <strong>Heart Conditions &amp; Dental Treatment</strong><br><br>Heart conditions can affect certain dental treatments:<br><br>&#x2022; <strong>Pacemakers:</strong> Some ultrasonic equipment may interfere &mdash; tell us, we'll take precautions<br>&#x2022; <strong>Artificial valves / joint replacements:</strong> Antibiotic prophylaxis may be required (we'll check current guidelines)<br>&#x2022; <strong>Recent heart attack or stroke:</strong> Wait 6 months before elective treatment<br>&#x2022; <strong>All medications:</strong> Tell us everything<br><br>Your safety is always our priority. Call "+phoneInline+".",
            "&#x1F4CB; <strong>Bisphosphonates &amp; Dental Care</strong><br><br>Bisphosphonates (alendronate, risedronate, zoledronate) are used for osteoporosis and cancer treatment, and can affect dental healing:<br><br>&#x2022; Risk of MRONJ (medication-related osteonecrosis of the jaw) after extractions<br>&#x2022; Risk increases with IV bisphosphonates (used in cancer care)<br>&#x2022; We always review medication history before any extraction<br>&#x2022; In most cases, dental treatment can proceed with extra care<br><br>Please always tell us what medications you take. Call "+phoneInline+"."
        ]
    },
    {
        id: 'smoking',
        priority: 0,
        keywords: ['smoking','smoke','cigarette','tobacco','vaping','vape','e-cigarette','nicotine','quit smoking','stop smoking'],
        weight: 4,
        responses: [
            "&#x1F6AD; <strong>Smoking &amp; Oral Health</strong><br><br>Smoking has serious consequences for your mouth:<br><br>&#x2022; 6x increased risk of gum disease<br>&#x2022; Significantly slows healing after extractions and surgery<br>&#x2022; Causes persistent bad breath and staining<br>&#x2022; <strong>Massively increases oral cancer risk</strong><br>&#x2022; Masks gum disease symptoms (reduced bleeding)<br><br>Vaping is better than smoking but still causes dry mouth, gum irritation, and some cancer risk.<br><br>We can advise on quitting at any appointment. Ask your dentist!",
            "&#x1F6AD; <strong>Effects of Smoking on Your Teeth</strong><br><br>&#x2022; Yellow staining on teeth<br>&#x2022; Bad breath (halitosis)<br>&#x2022; Gum disease &mdash; smokers have 6x higher risk<br>&#x2022; Delayed healing after treatment<br>&#x2022; Oral cancer risk increased by up to 10x<br>&#x2022; Implant failure rates higher in smokers<br><br>Quitting is the single best thing you can do for your oral health. Ask us for support at your next visit.",
            "&#x1F6AD; <strong>Smoking / Vaping Advice</strong><br><br>We won't judge you, but we will be honest:<br><br>&#x2022; Smoking is the biggest preventable risk factor for oral cancer<br>&#x2022; Vaping still causes dry mouth and gum inflammation<br>&#x2022; Both interfere with gum disease healing<br>&#x2022; Stopping even for a few weeks before treatment improves outcomes<br><br>NHS Stop Smoking services are free and effective. Ask your dentist for a referral at your next check-up.",
            "&#x1F6AD; <strong>Smoking &amp; Oral Cancer Risk</strong><br><br>This is important to know:<br><br>&#x2022; Smokers are up to <strong>10x more likely</strong> to develop oral cancer than non-smokers<br>&#x2022; Combined with alcohol, the risk is even higher<br>&#x2022; HPV is another significant risk factor regardless of smoking status<br>&#x2022; We screen for oral cancer at every check-up<br>&#x2022; Catching it early is critical &mdash; early-stage oral cancer has a 90%+ survival rate<br><br>Don't skip your check-ups. Call "+phoneInline+".",
            "&#x1F6AD; <strong>How Smoking Affects Healing</strong><br><br>If you're having any dental treatment, smoking affects recovery:<br><br>&#x2022; Reduces blood flow to gum tissue<br>&#x2022; Slows healing after extractions &mdash; higher dry socket risk<br>&#x2022; Gum disease treatment is significantly less effective in smokers<br>&#x2022; Implant failure rates are doubled in smokers<br><br>Stopping smoking even for 2 weeks before and after treatment makes a significant difference. Ask us about NHS Stop Smoking referrals.",
            "&#x1F6AD; <strong>Stopping Smoking &mdash; Dental Benefits</strong><br><br>The improvements to your oral health after stopping are rapid:<br><br>&#x2022; <strong>24 hours:</strong> Oral cancer risk starts dropping<br>&#x2022; <strong>1 week:</strong> Gum blood flow improves<br>&#x2022; <strong>1 month:</strong> Gum disease responds much better to treatment<br>&#x2022; <strong>1 year:</strong> Oral cancer risk halved<br>&#x2022; <strong>5 years:</strong> Cancer risk approaches that of a non-smoker<br><br>It's never too late to stop. Ask us about NHS Stop Smoking support at your next visit."
        ]
    },
    {
        id: 'diet',
        priority: 0,
        keywords: ['diet','sugar','sugary','sweet','fizzy','cola','juice','acid teeth','erosion','coffee stain','tea stain','staining','yellowing','discolouring','wine teeth','food teeth','what to eat','what not to eat','tooth friendly'],
        weight: 4,
        responses: [
            "&#x1F34E; <strong>Diet &amp; Your Teeth</strong><br><br><strong>Reduce or avoid:</strong><br>&#x2022; Sugary drinks and snacks<br>&#x2022; Fizzy drinks (even 'diet' &mdash; still acidic)<br>&#x2022; Fruit juice (natural sugar, high acid)<br>&#x2022; Picking at sweet snacks throughout the day<br><br><strong>Tooth-friendly foods:</strong><br>&#x2022; Cheese &mdash; neutralises acid and contains calcium<br>&#x2022; Crunchy vegetables &mdash; stimulate saliva<br>&#x2022; Water &mdash; fluoridated tap water is best<br>&#x2022; Sugar-free gum after meals<br><br><strong>Tips:</strong> Drink acidic drinks through a straw. Wait 30 min after eating before brushing.",
            "&#x1F34E; <strong>What's Bad for Your Teeth?</strong><br><br>&#x2022; <strong>Frequency</strong> matters more than amount &mdash; sipping fizzy drinks all day is worse than having one with a meal<br>&#x2022; Citric acid erodes enamel quickly (lemon water, citrus fruit)<br>&#x2022; Red wine, coffee, and tea cause staining<br>&#x2022; Sticky sweets stay in contact with teeth longest<br><br>Professional cleaning removes most staining. Whitening can help with deeper discolouration. Call "+phoneInline+".",
            "&#x1F34E; <strong>Diet for a Healthier Smile</strong><br><br>Simple swaps that make a real difference:<br><br>&#x2022; Water instead of juice or fizzy drinks<br>&#x2022; Cheese instead of biscuits as a snack<br>&#x2022; Sugar-free gum (xylitol) after meals<br>&#x2022; Rinse with water after acidic foods<br>&#x2022; Finish meals with dairy to neutralise acid<br><br>Regular hygiene visits keep your teeth clean regardless of diet. Book: "+phoneInline,
            "&#x1F34E; <strong>Sugar &amp; Tooth Decay</strong><br><br>It's not just how much sugar you have &mdash; it's <strong>how often</strong>:<br><br>&#x2022; Every sugar exposure triggers an acid attack lasting 20&ndash;40 minutes<br>&#x2022; Sipping a sugary drink over 2 hours = 2 hours of acid attack<br>&#x2022; Limit sugary foods to mealtimes &mdash; far less damaging than snacking all day<br>&#x2022; Sugar-free versions of drinks still contain acid (citric, phosphoric)<br>&#x2022; Water is the best drink for your teeth by far<br><br>Ask your hygienist for a diet diary analysis at your next visit.",
            "&#x1F34E; <strong>Enamel Erosion from Acidic Food &amp; Drinks</strong><br><br>Acid attacks enamel &mdash; even 'healthy' foods can cause damage:<br><br>&#x2022; Citrus fruits, apples, and tomatoes are acidic<br>&#x2022; Fizzy water and diet drinks are acidic even without sugar<br>&#x2022; Fruit teas and herbal teas can be surprisingly acidic<br>&#x2022; Sports drinks are highly acidic<br><br><strong>Protect yourself:</strong> Rinse with water after acidic food/drink. Wait 30 minutes before brushing. Use a straw for acidic drinks. Book: "+phoneInline,
            "&#x1F34E; <strong>Best Foods for Your Teeth</strong><br><br>Load your diet with these tooth-friendly choices:<br><br>&#x2022; <strong>Cheese and dairy:</strong> Calcium, phosphate, neutralises acid<br>&#x2022; <strong>Crunchy veg (celery, carrots):</strong> Stimulates saliva, cleans mechanically<br>&#x2022; <strong>Leafy greens:</strong> Calcium and folic acid<br>&#x2022; <strong>Eggs and nuts:</strong> Phosphorus for enamel remineralisation<br>&#x2022; <strong>Water:</strong> Rinses food particles, fluoridated tap water adds protection<br>&#x2022; <strong>Sugar-free gum (xylitol):</strong> Stimulates saliva, actively inhibits bacteria<br><br>Great diet + great hygiene = great teeth. Book a check-up: "+phoneInline
        ]
    },
    {
        id: 'brushing',
        priority: 0,
        keywords: ['brush','brushing','how to brush','toothbrush','electric toothbrush','manual toothbrush','brushing technique','brushing teeth','brush properly','brushing guide','how often brush','when to brush'],
        weight: 4,
        responses: [
            "&#x1FAA5; <strong>Brushing Guide</strong><br><br>&#x2022; Brush <strong>twice daily</strong> &mdash; last thing at night is the most important<br>&#x2022; Use <strong>fluoride toothpaste</strong> (at least 1350ppm for adults; 1000ppm for children)<br>&#x2022; <strong>2 minutes</strong> each session<br>&#x2022; Soft-bristled brush, gentle circular or small back-and-forth motions<br>&#x2022; Include the gum line and behind teeth<br>&#x2022; Brush the <strong>tongue</strong> for fresh breath<br>&#x2022; <strong>Spit, don't rinse</strong> &mdash; rinsing washes away the fluoride<br>&#x2022; Replace your brush every <strong>3 months</strong> or when bristles splay<br>&#x2022; Electric brushes are excellent &mdash; they do the motion for you",
            "&#x1FAA5; <strong>How to Brush Your Teeth Properly</strong><br><br>It's not just about brushing &mdash; it's about brushing <em>correctly</em>:<br><br>&#x2022; Small, gentle circular strokes at 45&deg; to the gumline<br>&#x2022; Cover all surfaces: outer, inner, biting<br>&#x2022; 2 minutes minimum (try a timer or electric brush with built-in timer)<br>&#x2022; Don't rinse after &mdash; just spit<br>&#x2022; Soft brush only &mdash; hard brushes damage gums and enamel<br><br>Ask your hygienist to check your technique at your next visit!",
            "&#x1FAA5; <strong>Brushing Tips</strong><br><br>&#x2022; Twice a day &mdash; morning and <strong>especially before bed</strong><br>&#x2022; 2 minutes &mdash; no less<br>&#x2022; Fluoride toothpaste &mdash; don't rinse off<br>&#x2022; Soft head, gentle pressure<br>&#x2022; Electric toothbrush recommended (oscillating-rotating type)<br>&#x2022; Don't forget your tongue and the backs of your teeth<br><br>Your technique matters as much as frequency. Ask us at your next check-up!",
            "&#x1FAA5; <strong>Electric vs Manual Toothbrush</strong><br><br>Both can be effective, but evidence favours electric:<br><br>&#x2022; <strong>Oscillating-rotating electric (e.g. Oral-B):</strong> Best evidence for plaque removal<br>&#x2022; <strong>Sonic electric (e.g. Sonicare):</strong> Good for sensitive gums<br>&#x2022; <strong>Manual:</strong> Perfectly effective with good technique<br><br>Electric brushes are especially good if you brush too hard, have limited dexterity, or rush when brushing. The built-in timer ensures 2 minutes every time!",
            "&#x1FAA5; <strong>Why 'Spit, Don't Rinse'?</strong><br><br>This is one of the most important brushing tips most people miss:<br><br>&#x2022; Fluoride toothpaste leaves a protective coating on your teeth<br>&#x2022; Rinsing with water immediately after brushing removes 95% of this fluoride<br>&#x2022; Just spit out the excess toothpaste &mdash; that's all<br>&#x2022; Your mouth will feel a little different at first but you'll get used to it<br>&#x2022; This simple change significantly reduces cavity risk<br><br>Ask your hygienist about it at your next visit!",
            "&#x1FAA5; <strong>Brushing Children's Teeth</strong><br><br>Brush their teeth for them until they have the dexterity to do it themselves:<br><br>&#x2022; <strong>0&ndash;2 years:</strong> Smear of 1000ppm fluoride toothpaste<br>&#x2022; <strong>3&ndash;6 years:</strong> Pea-sized amount, 1000ppm<br>&#x2022; <strong>7+ years:</strong> Pea-sized amount, 1350&ndash;1500ppm (adult strength)<br>&#x2022; Brush their teeth for them until age 7, then supervise until 10<br>&#x2022; Spit, don't rinse &mdash; teach this from the start<br><br>Register your child with us: "+phoneInline,
            "&#x1FAA5; <strong>When Should I Brush?</strong><br><br>Timing matters more than most people realise:<br><br>&#x2022; <strong>Morning:</strong> After breakfast (not before &mdash; you're washing away the protective coating)<br>&#x2022; <strong>Night:</strong> After your last food or drink (excluding water) &mdash; this is the most important brush<br>&#x2022; <strong>After acidic food/drink:</strong> Wait 30 minutes &mdash; enamel is temporarily softened by acid and immediate brushing can damage it<br>&#x2022; <strong>After sugary snacks:</strong> Rinsing with water is better than immediately brushing<br><br>Ask your hygienist if you'd like personalised advice."
        ]
    },
    {
        id: 'flossing',
        priority: 0,
        keywords: ['floss','flossing','interdental brush','between teeth','food stuck between teeth','food between teeth','tepe','waterflosser','water flosser','floss picks','dental floss'],
        weight: 4,
        responses: [
            "&#x1F9F7; <strong>Flossing &amp; Interdental Cleaning</strong><br><br>&#x2022; Clean between teeth <strong>once daily</strong> &mdash; any time, but bedtime is ideal<br>&#x2022; Traditional floss, floss picks, or <strong>TePe interdental brushes</strong> &mdash; all work well<br>&#x2022; Water flossers (Waterpik) are excellent if you find floss tricky<br>&#x2022; Gently slide between teeth and curve around each tooth in a C-shape<br>&#x2022; Bleeding when you start is normal &mdash; it stops within 2 weeks as gums improve<br>&#x2022; This prevents 40% of dental surfaces from being missed<br><br>Your hygienist can demonstrate the best technique for your mouth!",
            "&#x1F9F7; <strong>Why Floss?</strong><br><br>Your toothbrush misses the surfaces between teeth &mdash; that's where a lot of decay and gum disease starts!<br><br>&#x2022; Floss, TePe brushes, or water flossers: pick what you'll actually use<br>&#x2022; Once a day is enough<br>&#x2022; If gums bleed: keep going (gently) and they'll strengthen within weeks<br>&#x2022; TePe brushes come in different sizes &mdash; ask your hygienist which is right for your gaps<br><br>Book a hygiene appointment for a personalised demo: "+phoneInline,
            "&#x1F9F7; <strong>Interdental Cleaning Guide</strong><br><br>Choose your weapon:<br>&#x2022; <strong>Floss:</strong> Best for tight contacts<br>&#x2022; <strong>TePe interdental brushes:</strong> Best for larger gaps<br>&#x2022; <strong>Water flosser:</strong> Great for bridges, implants, or those with limited dexterity<br>&#x2022; <strong>Floss picks:</strong> Easier to use than traditional floss<br><br>Daily use prevents 40% of decay and most gum disease. Start today! Ask us at your next appointment.",
            "&#x1F9F7; <strong>How to Use TePe Interdental Brushes</strong><br><br>TePe brushes are one of the best interdental cleaning tools available:<br><br>&#x2022; Choose the right size &mdash; should fit snugly without forcing (your hygienist can help)<br>&#x2022; Insert gently between teeth at the gum line<br>&#x2022; Move back and forth a few times<br>&#x2022; Rinse the brush and move to the next gap<br>&#x2022; No need to use toothpaste on the brush<br>&#x2022; Replace when bristles wear down<br><br>Sizes are colour-coded &mdash; ask which you need at your next check-up.",
            "&#x1F9F7; <strong>Flossing the Right Way</strong><br><br>Many people floss incorrectly &mdash; here's how to do it properly:<br><br>1. Use about 40cm of floss, wound around middle fingers<br>2. Hold 2&ndash;3cm taut between thumbs and forefingers<br>3. Slide gently between teeth using a zigzag motion<br>4. Curve around each tooth in a C-shape and slide up under the gum line<br>5. Use a fresh section of floss for each gap<br><br>Ask your hygienist to check your technique at your next visit.",
            "&#x1F9F7; <strong>My Gums Bleed When I Floss &mdash; Should I Stop?</strong><br><br>No! This is the most common mistake patients make:<br><br>&#x2022; Bleeding when you start flossing means your gums are inflamed from <em>not</em> flossing<br>&#x2022; Keep going gently &mdash; bleeding will reduce within 2 weeks as gums strengthen<br>&#x2022; If bleeding is excessive or lasts more than 2 weeks, book a hygiene appointment<br>&#x2022; Healthy gums should not bleed with gentle flossing<br><br>Book a hygiene appointment: "+phoneInline
        ]
    },
    {
        id: 'mouthwash',
        priority: 0,
        keywords: ['mouthwash','mouth rinse','corsodyl','listerine','antiseptic rinse','fluoride rinse','mouthrinse','rinse mouth','oral rinse'],
        weight: 3,
        responses: [
            "&#x1F9B7; <strong>Using Mouthwash Correctly</strong><br><br>&#x2022; Use mouthwash at a <strong>different time to brushing</strong> (e.g. after lunch)<br>&#x2022; <strong>Don't use right after brushing</strong> &mdash; it rinses away protective fluoride<br>&#x2022; <strong>Fluoride mouthwash</strong> (e.g. Colgate Plax, ACT) adds extra enamel protection<br>&#x2022; <strong>Corsodyl</strong> is effective for gum disease but long-term use can cause staining<br>&#x2022; Mouthwash is a supplement, not a replacement for brushing and flossing!",
            "&#x1F9B7; <strong>Mouthwash Tips</strong><br><br>&#x2022; Time it: after breakfast/lunch, not right after brushing<br>&#x2022; For gum problems: Corsodyl (chlorhexidine) is very effective &mdash; use for 4 weeks, then switch to fluoride rinse<br>&#x2022; For general protection: fluoride-containing mouthwash<br>&#x2022; Alcohol-free versions better for dry mouth<br>&#x2022; Children under 6: avoid mouthwash unless prescribed<br><br>Any questions? Ask at your next check-up!",
            "&#x1F9B7; <strong>Which Mouthwash Should I Use?</strong><br><br>&#x2022; <strong>For gum disease:</strong> Corsodyl 0.2% (2x daily for up to 4 weeks)<br>&#x2022; <strong>For general protection:</strong> Fluoride mouthwash (1x daily, after lunch)<br>&#x2022; <strong>For fresh breath:</strong> Any antibacterial rinse<br>&#x2022; <strong>For dry mouth:</strong> Alcohol-free rinse or Biotène<br><br>Remember: use it separately from brushing. Ask your dentist at your next visit!",
            "&#x1F9B7; <strong>Is Mouthwash Necessary?</strong><br><br>Mouthwash is helpful but not essential if your brushing and flossing are excellent:<br><br>&#x2022; Mouthwash cannot substitute for brushing and flossing<br>&#x2022; It does reach areas brushes and floss can't<br>&#x2022; Fluoride mouthwash adds an extra layer of decay protection<br>&#x2022; Antibacterial mouthwash helps with gum health and breath<br>&#x2022; Use it at a different time to brushing (e.g. after lunch) for maximum benefit<br><br>Ask your hygienist which type is best for your specific needs.",
            "&#x1F9B7; <strong>Corsodyl &mdash; How to Use It Correctly</strong><br><br>Corsodyl (chlorhexidine) is the most effective prescription-strength mouthwash for gum disease:<br><br>&#x2022; Use 10ml for 1 minute, twice daily<br>&#x2022; Don't eat or drink for 30 minutes after<br>&#x2022; Use for no longer than <strong>4 weeks continuously</strong> (causes tooth staining with prolonged use)<br>&#x2022; After 4 weeks, switch to a fluoride or milder antibacterial rinse<br>&#x2022; Will temporarily stain teeth &mdash; removable at a hygiene visit<br><br>Any questions? Ask at your appointment.",
            "&#x1F9B7; <strong>Children &amp; Mouthwash</strong><br><br>Mouthwash isn't suitable for all ages:<br><br>&#x2022; <strong>Under 6:</strong> Do not use &mdash; risk of swallowing<br>&#x2022; <strong>6&ndash;12:</strong> Supervised use only; choose an age-appropriate fluoride rinse<br>&#x2022; <strong>12+:</strong> Can use adult fluoride mouthwash<br><br>For young children, the priority is brushing with fluoride toothpaste. Mouthwash can be added later. Ask your dentist at your child's next check-up."
        ]
    },
    {
        id: 'tongue_cleaning',
        priority: 0,
        keywords: ['tongue','tongue cleaning','tongue scraper','clean tongue','brush tongue','tongue bacteria','white tongue','coated tongue'],
        weight: 3,
        responses: [
            "&#x1F445; <strong>Tongue Cleaning</strong><br><br>Your tongue harbours bacteria that cause bad breath and contribute to plaque:<br><br>&#x2022; Brush your tongue gently when you brush your teeth<br>&#x2022; Or use a <strong>tongue scraper</strong> for more thorough cleaning<br>&#x2022; Move from back to front with gentle strokes<br>&#x2022; Rinse after<br>&#x2022; Do it daily &mdash; especially last thing at night<br><br>It's one of the most overlooked oral hygiene steps!",
            "&#x1F445; <strong>Why Clean Your Tongue?</strong><br><br>&#x2022; The tongue's surface harbours millions of bacteria<br>&#x2022; These bacteria contribute significantly to bad breath<br>&#x2022; They also re-colonise your teeth after brushing<br>&#x2022; Tongue scrapers are inexpensive and very effective<br>&#x2022; Alternatively, use the back of your toothbrush head<br><br>Add it to your routine &mdash; takes only 10 seconds!",
            "&#x1F445; <strong>Tongue Scraper vs Toothbrush for Tongue Cleaning</strong><br><br>Both work, but tongue scrapers have an edge:<br><br>&#x2022; Dedicated tongue scrapers cover a wider area in one swipe<br>&#x2022; They remove more volatile sulphur compounds (the main cause of bad breath)<br>&#x2022; Plastic or stainless steel &mdash; both effective<br>&#x2022; Rinse thoroughly after each use<br>&#x2022; If a scraper isn't for you, brushing your tongue with your toothbrush is a very good second option<br><br>Add it to your morning routine!",
            "&#x1F445; <strong>White or Coated Tongue</strong><br><br>A white or yellowish coating on the tongue is usually nothing to worry about:<br><br>&#x2022; Caused by bacteria, dead cells, and food particles accumulating in the tongue papillae<br>&#x2022; Regular tongue cleaning solves it in most cases<br>&#x2022; Can also be caused by dry mouth, smoking, or antibiotics<br>&#x2022; <strong>See us if:</strong> Coating is thick, persistent despite cleaning, or accompanied by soreness or difficulty swallowing<br><br>Persistent unexplained white patches should always be checked. Call "+phoneInline+".",
            "&#x1F445; <strong>When Should I Clean My Tongue?</strong><br><br>Add tongue cleaning to your existing brushing routine:<br><br>&#x2022; Ideally last thing at night after brushing &mdash; removes bacteria before your mouth goes dry overnight<br>&#x2022; Also helpful in the morning before breakfast<br>&#x2022; Takes 10&ndash;15 seconds &mdash; not a major commitment!<br>&#x2022; Most people notice an immediate improvement in breath<br><br>It's one of the most impactful small changes you can make for oral hygiene."
        ]
    },
    {
        id: 'aftercare',
        priority: 0,
        keywords: ['aftercare','after treatment','recovery','after extraction','after filling','what to eat after','swelling after','bleeding after','after root canal','post treatment','after dental','after procedure','healing','socket','dry socket'],
        weight: 5,
        responses: [
            "&#x1F3E5; <strong>Aftercare Advice</strong><br><br><strong>After extractions:</strong><br>&#x2022; Bite firmly on gauze for 20 minutes<br>&#x2022; No hot drinks for 24 hours<br>&#x2022; No smoking or alcohol for at least 48 hours<br>&#x2022; Soft foods for 24&ndash;48 hours<br>&#x2022; Don't rinse for 24 hours, then warm salt water rinses 3x daily<br><br><strong>After fillings:</strong><br>&#x2022; Wait for numbness to fully wear off before eating<br>&#x2022; Some sensitivity for a few days is normal<br><br><strong>After root canal:</strong><br>&#x2022; Take prescribed or over-the-counter pain relief as directed<br>&#x2022; Avoid chewing on that side until crowned<br><br>&#x26A0;&#xFE0F; <strong>Contact us if:</strong> Excessive bleeding, severe pain, or swelling gets worse. Call "+phoneInline+".",
            "&#x1F3E5; <strong>Post-Treatment Recovery</strong><br><br><strong>Extraction aftercare:</strong><br>&#x2022; Blood clot is vital &mdash; don't disturb it<br>&#x2022; If bleeding restarts: fold gauze, bite firmly for 20 mins<br>&#x2022; Signs of dry socket (days 2&ndash;4): throbbing pain, bad taste &mdash; call us<br><br><strong>Filling aftercare:</strong><br>&#x2022; Your bite should feel normal within a few days<br>&#x2022; If bite feels high: call us, may need adjusting<br><br><strong>Root canal aftercare:</strong><br>&#x2022; Some discomfort for 3&ndash;5 days is normal<br>&#x2022; Take ibuprofen and paracetamol alternately for pain<br><br>Any concerns? Call "+phoneInline+".",
            "&#x1F3E5; <strong>Dry Socket &mdash; What Is It and What to Do</strong><br><br>Dry socket is the most common complication after extraction (affecting about 5% of patients):<br><br>&#x2022; Occurs when the blood clot dislodges or dissolves before the socket heals<br>&#x2022; Symptoms: Throbbing pain starting 2&ndash;4 days after extraction, bad taste, bad smell<br>&#x2022; <strong>Do not</strong> smoke, use a straw, or rinse vigorously for 48 hours<br>&#x2022; If you suspect dry socket: call "+phoneInline+" &mdash; we'll pack the socket with soothing dressing<br><br>Higher risk in smokers, those on the pill, or lower wisdom tooth extractions.",
            "&#x1F3E5; <strong>What to Eat After Dental Treatment</strong><br><br>After extractions or oral surgery:<br><br>&#x2022; <strong>First 24 hours:</strong> Cold/room temperature soft foods &mdash; yoghurt, ice cream, soup (not hot), mashed potato<br>&#x2022; <strong>24&ndash;72 hours:</strong> Soft foods &mdash; scrambled eggs, pasta, fish<br>&#x2022; <strong>After 3&ndash;5 days:</strong> Gradually reintroduce normal foods as comfort allows<br><br>After fillings or crowns: wait for anaesthetic to fully wear off before eating to avoid biting your cheek.",
            "&#x1F3E5; <strong>When to Call Us After Treatment</strong><br><br>Always call "+phoneInline+" if you notice:<br><br>&#x2022; Excessive bleeding that won't stop after 20+ minutes of pressure<br>&#x2022; Swelling that's getting <strong>worse</strong> after day 2 (some swelling is normal)<br>&#x2022; Severe pain that's not responding to pain relief<br>&#x2022; Temperature or flu-like symptoms (sign of spreading infection)<br>&#x2022; The bite feels very wrong after a filling or crown<br>&#x2022; Dry socket symptoms (throbbing pain, bad taste, after extraction)<br><br>We'd always rather hear from you than have you suffer at home."
        ]
    },

    // ════════════════════════════════════════
    // TEAM & PRACTICE INFO
    // ════════════════════════════════════════
    {
        id: 'team',
        priority: 0,
        keywords: ['team','staff','niti kaushal','niti','kaushal','principal dentist','dr kaushal','who is the dentist','who is my dentist','who are the dentists','heathway team','meet the team','about dr kaushal','who works at','your dentists','dental team'],
        weight: 5,
        responses: [
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>Our Team</strong><br><br><strong>Dr Niti Kaushal</strong> &mdash; Principal Dentist<br>Dr Kaushal leads our practice with extensive clinical experience and a reputation for being gentle and thorough. She is particularly skilled with nervous patients.<br><br>Our full team includes experienced clinicians and a warm, welcoming reception and nursing team, all committed to delivering excellent care.<br><br>Learn more on our <a href='heathway-about.html' style='color:var(--teal)'>About page</a>.",
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>Meet Dr Niti Kaushal</strong><br><br>Dr Kaushal is the Principal Dentist at The Heathway Dental Surgery. She has extensive experience across general, preventive, and restorative dentistry and is known for her calm, reassuring manner &mdash; especially appreciated by nervous patients.<br><br>Our support team is equally dedicated to making your visit as pleasant as possible. Call "+phoneInline+" or visit our <a href='heathway-about.html' style='color:var(--teal)'>About page</a>.",
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>The Heathway Dental Team</strong><br><br>Our practice is led by <strong>Dr Niti Kaushal</strong>, Principal Dentist, supported by an experienced team of dental nurses and reception staff.<br><br>We pride ourselves on a warm, family-friendly atmosphere where every patient feels welcome. Call "+phoneInline+" &mdash; you'll hear the difference from the very first call!",
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>Dr Niti Kaushal &mdash; Principal Dentist</strong><br><br>Dr Kaushal founded The Heathway Dental Surgery and has built it into a trusted local practice over many years of dedicated service.<br><br>&#x2022; Experienced in general, restorative, and preventive dentistry<br>&#x2022; Particularly skilled with nervous and anxious patients<br>&#x2022; Known for a calm, thorough, and compassionate approach<br>&#x2022; GDC registered and CQC compliant<br><br>To book with Dr Kaushal, call "+phoneInline+".",
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>Our Support Team</strong><br><br>The dentist doesn't work alone &mdash; our whole team makes your visit great:<br><br>&#x2022; <strong>Dental Nurses:</strong> Experienced, reassuring, and skilled at putting patients at ease<br>&#x2022; <strong>Receptionist:</strong> Friendly, knowledgeable, and always happy to help with any query<br>&#x2022; <strong>Practice Manager:</strong> Oversees quality of care and is your first contact for any concerns<br><br>From your first call to leaving the chair, our team is with you every step of the way. "+phoneInline,
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>A Family Practice with Heart</strong><br><br>Heathway Dental is a small, independent NHS practice &mdash; not a chain. That means:<br><br>&#x2022; You'll see familiar faces at every visit<br>&#x2022; Your whole history is known to us<br>&#x2022; We genuinely care about long-term patient relationships<br>&#x2022; Decisions are made in your best interest, not corporate targets<br><br>We've been serving Dagenham and the surrounding area for many years. We'd love to welcome you. Call "+phoneInline+".",
            "&#x1F469;&#x200D;&#x2695;&#xFE0F; <strong>Meet the Team at Our About Page</strong><br><br>Find out more about the people behind Heathway Dental on our <a href='heathway-about.html' style='color:var(--teal)'>About Us page</a>.<br><br>You'll find information about Dr Kaushal, our values, and our approach to patient care.<br><br>Or skip the reading and give us a call &mdash; "+phoneInline+". We'd love to hear from you!"
        ]
    },
    {
        id: 'cqc',
        priority: 0,
        keywords: ['cqc','regulated','inspection','cqc registered','safe','standards','quality','accredited','nhs approved','regulated practice','inspected'],
        weight: 4,
        responses: [
            "&#x2705; <strong>CQC Registered Practice</strong><br><br>The Heathway Dental Surgery is:<br><br>&#x2022; Fully <strong>CQC (Care Quality Commission)</strong> registered<br>&#x2022; <strong>NHS registered</strong> practice<br>&#x2022; Compliant with all GDC (General Dental Council) requirements<br>&#x2022; Regular infection control audits<br>&#x2022; Staff undergo continuous professional development (CPD)<br><br>Your safety and care quality are always our top priorities.",
            "&#x2705; <strong>Our Standards</strong><br><br>We're registered with the <strong>Care Quality Commission (CQC)</strong> &mdash; the independent regulator of all health and social care in England.<br><br>All clinical staff are registered with the <strong>General Dental Council (GDC)</strong>. Our infection control and clinical protocols meet or exceed all required standards.<br><br>You're in safe, regulated hands at Heathway Dental.",
            "&#x2705; <strong>What Does CQC Registration Mean?</strong><br><br>The Care Quality Commission inspects health and social care providers against five key standards:<br><br>&#x2022; <strong>Safe:</strong> Protection from avoidable harm and abuse<br>&#x2022; <strong>Effective:</strong> Care achieves good outcomes<br>&#x2022; <strong>Caring:</strong> Staff treat people with compassion and respect<br>&#x2022; <strong>Responsive:</strong> Services meet people's individual needs<br>&#x2022; <strong>Well-led:</strong> Good leadership and governance<br><br>We're proud to meet these standards. Your care quality matters to us.",
            "&#x2705; <strong>GDC Registration</strong><br><br>All our dental professionals are registered with the <strong>General Dental Council (GDC)</strong> &mdash; the UK regulator for dental professionals.<br><br>This means:<br>&#x2022; They hold recognised dental qualifications<br>&#x2022; They maintain their skills through Continuing Professional Development (CPD)<br>&#x2022; They follow the GDC's standards for the dental team<br>&#x2022; They are insured and work within their scope of practice<br><br>You can verify registration at <a href='https://olr.gdc-uk.org/' target='_blank' style='color:var(--teal)'>gdc-uk.org</a>.",
            "&#x2705; <strong>NHS Contract &amp; Quality Standards</strong><br><br>As an NHS registered practice, we:<br><br>&#x2022; Follow NHS clinical guidelines and pathways<br>&#x2022; Charge only NHS band charges (no hidden fees)<br>&#x2022; Submit to NHS England oversight and audits<br>&#x2022; Participate in quality improvement programmes<br>&#x2022; Maintain up-to-date medical records and consent procedures<br><br>Choosing an NHS practice means knowing exactly what you'll pay and that your care meets national standards. Call "+phoneInline+"."
        ]
    },
    {
        id: 'covid_safety',
        priority: 0,
        keywords: ['covid','coronavirus','infection control','ppe','mask','sterilise','sterilization','sterilisation','safe to visit','is it safe','hygiene standards'],
        weight: 4,
        responses: [
            "&#x1F637; <strong>Infection Control &amp; Safety</strong><br><br>We maintain the highest standards of infection control at all times:<br><br>&#x2022; Full PPE for all clinical procedures<br>&#x2022; Rigorous sterilisation and decontamination of all instruments<br>&#x2022; Hand sanitiser stations throughout the practice<br>&#x2022; Regular deep cleaning of all clinical areas between patients<br>&#x2022; Enhanced ventilation in treatment rooms<br>&#x2022; CQC inspected and compliant<br><br>Your safety has always been and will always remain our top priority.",
            "&#x1F637; <strong>Is It Safe to Visit?</strong><br><br>Absolutely. Dental practices like ours follow strict infection control protocols far beyond typical medical settings:<br><br>&#x2022; All instruments fully sterilised in autoclave between every patient<br>&#x2022; Disposable items used where possible<br>&#x2022; Full PPE (gloves, mask, visor) for all clinical procedures<br>&#x2022; Thorough disinfection of all surfaces between patients<br>&#x2022; Regular CQC inspections ensure compliance<br><br>It's safe to visit. Book: "+phoneInline,
            "&#x1F637; <strong>Our Sterilisation Process</strong><br><br>Every reusable instrument goes through a rigorous decontamination cycle between patients:<br><br>1. <strong>Cleaning:</strong> Ultrasonic bath removes debris<br>2. <strong>Rinsing:</strong> Thorough rinse before packaging<br>3. <strong>Autoclaving:</strong> High-pressure steam sterilisation at 134°C<br>4. <strong>Storage:</strong> Sealed pouches protect until use<br><br>This process exceeds HTM 01-05 NHS decontamination standards. You can trust your safety with us.",
            "&#x1F637; <strong>Dental Infection Control &mdash; Your Questions Answered</strong><br><br><strong>Q: Are needles reused?</strong> Absolutely not &mdash; all needles and cartridges are single-use.<br><strong>Q: Are gloves changed between patients?</strong> Yes, always.<br><strong>Q: Is the chair cleaned?</strong> Yes, full decontamination of all surfaces between every patient.<br><strong>Q: Is it safe if I'm immunocompromised?</strong> Yes &mdash; please tell us and we'll take any additional precautions needed.<br><br>Any other questions? Call "+phoneInline+" and we'll answer honestly.",
            "&#x1F637; <strong>What PPE Does the Dental Team Wear?</strong><br><br>For all clinical procedures, our team wears:<br><br>&#x2022; Disposable gloves (changed between every patient)<br>&#x2022; Surgical mask (or FFP2/FFP3 for aerosol-generating procedures)<br>&#x2022; Eye protection (visor or safety glasses)<br>&#x2022; Protective clothing<br><br>This protects both you and our team. It's standard practice in dentistry and has been for many years. Call "+phoneInline+" if you have any concerns."
        ]
    },
    {
        id: 'accessibility',
        priority: 0,
        keywords: ['wheelchair','disabled','disability','accessibility','mobility','step-free','ramp','lift','access','hearing','visually impaired','special needs','adaptations'],
        weight: 4,
        responses: [
            "&#x267F; <strong>Accessibility</strong><br><br>We strive to make our practice accessible to all patients.<br><br>Please call us on "+phoneInline+" <strong>before your visit</strong> to discuss your specific requirements. Our team will do everything possible to ensure your appointment is comfortable and accessible.",
            "&#x267F; <strong>Accessible Dental Care</strong><br><br>We want everyone to be able to access dental care. If you have mobility, sensory, or other accessibility needs, please let us know when booking on "+phoneInline+".<br><br>We'll make appropriate arrangements to ensure you can attend and receive treatment comfortably.",
            "&#x267F; <strong>Wheelchair Access</strong><br><br>Please call us on "+phoneInline+" before your first visit to discuss access arrangements. Our team will:<br><br>&#x2022; Advise on the best entrance and route<br>&#x2022; Ensure a treatment room is arranged for your needs<br>&#x2022; Allow extra time so there's no rush<br>&#x2022; Assist you as needed throughout your visit<br><br>We want every patient to receive the care they need, regardless of mobility.",
            "&#x267F; <strong>Accessibility &mdash; Hearing or Visual Impairment</strong><br><br>We can make adaptations for patients with hearing or visual impairments:<br><br>&#x2022; All important information communicated in writing if helpful<br>&#x2022; We speak clearly and without a mask if you lip-read<br>&#x2022; A carer or companion is always welcome to accompany you<br>&#x2022; Extra time given to explain treatment fully<br><br>Please let us know your needs when booking on "+phoneInline+".",
            "&#x267F; <strong>Caring for Patients with Special Needs</strong><br><br>We're committed to providing accessible, dignified dental care for all:<br><br>&#x2022; Patients with learning disabilities &mdash; we take extra time and use simple language<br>&#x2022; Dementia patients &mdash; familiar routines and calm, patient approach<br>&#x2022; Carers and support workers are always welcome<br>&#x2022; Home visits available in exceptional cases<br><br>Call "+phoneInline+" to discuss how we can best support you or your loved one."
        ]
    },
    {
        id: 'referral',
        priority: 0,
        keywords: ['referral','refer','specialist','hospital','consultant','orthodontist','periodontist','endodontist','oral surgeon','maxillofacial','second opinion'],
        weight: 4,
        responses: [
            "&#x1F3E5; <strong>Referrals &amp; Specialists</strong><br><br>When specialist treatment is needed, we arrange referrals to:<br><br>&#x2022; <strong>Orthodontists</strong> &mdash; complex teeth straightening cases<br>&#x2022; <strong>Oral surgeons</strong> &mdash; complex extractions, jaw surgery<br>&#x2022; <strong>Periodontists</strong> &mdash; advanced gum disease specialists<br>&#x2022; <strong>Endodontists</strong> &mdash; complex root canal cases<br><br>Your dentist will discuss the referral and arrange it for you. NHS referrals are available for clinically necessary specialist care. Call "+phoneInline+" for any queries.",
            "&#x1F3E5; <strong>Need a Second Opinion or Referral?</strong><br><br>You're always entitled to a second opinion. We welcome patients who've been told they need treatment elsewhere and want it confirmed.<br><br>When our dentist believes specialist care would benefit you, they'll:<br>&#x2022; Discuss the reason clearly<br>&#x2022; Write a detailed referral letter<br>&#x2022; Arrange NHS or private referral as appropriate<br><br>Call "+phoneInline+" to discuss.",
            "&#x1F3E5; <strong>NHS Specialist Referrals</strong><br><br>When you need specialist care, we can arrange NHS referrals to:<br><br>&#x2022; <strong>Orthodontists:</strong> Teeth straightening (especially for under-18s)<br>&#x2022; <strong>Oral &amp; maxillofacial surgeons:</strong> Complex extractions, jaw surgery, facial trauma<br>&#x2022; <strong>Periodontists:</strong> Advanced gum disease<br>&#x2022; <strong>Endodontists:</strong> Complex root canal cases<br><br>NHS referrals are free for clinically necessary care. Waiting times vary &mdash; we can advise on private alternatives if faster treatment is needed. Call "+phoneInline+".",
            "&#x1F3E5; <strong>Seeking a Second Opinion?</strong><br><br>You are always entitled to a second opinion on proposed dental treatment:<br><br>&#x2022; We're happy to see you for a second opinion on another dentist's recommendation<br>&#x2022; Bring any X-rays or written treatment plans from the other dentist if possible<br>&#x2022; We'll give you an honest, independent assessment<br>&#x2022; NHS Band 1 check-up charge (&#163;27.40) applies<br><br>Call "+phoneInline+" to arrange.",
            "&#x1F3E5; <strong>Private Specialist Referrals</strong><br><br>For patients who prefer faster access to specialist care:<br><br>&#x2022; We can write referral letters for private specialist consultations<br>&#x2022; Typically seen much faster than NHS pathways<br>&#x2022; Private specialists available for orthodontics, implants, periodontics, oral surgery<br>&#x2022; Costs vary by specialist &mdash; we can advise on estimated fees<br><br>Call "+phoneInline+" to discuss private referral options."
        ]
    },
    {
        id: 'waiting_times',
        priority: 0,
        keywords: ['how long wait','waiting time','wait for appointment','same day','quick appointment','how soon','earliest appointment','any appointments this week','urgent appointment','how busy'],
        weight: 4,
        responses: [
            "&#x23F0; <strong>Appointment Availability</strong><br><br>&#x2022; <strong>Routine check-ups:</strong> Usually within 1&ndash;2 weeks<br>&#x2022; <strong>Emergency/urgent:</strong> We aim to see urgent cases the same day<br>&#x2022; <strong>Cancellation list:</strong> Ask to be added for earlier slots<br><br>Availability can vary &mdash; for the most up-to-date slot information, please call "+phoneInline+" directly.",
            "&#x23F0; <strong>How Long is the Wait?</strong><br><br>It depends on the type of appointment:<br><br>&#x2022; <strong>Same-day:</strong> Dental emergencies (pain, swelling, knocked-out tooth)<br>&#x2022; <strong>This week / next week:</strong> Urgent non-emergency issues<br>&#x2022; <strong>1&ndash;4 weeks:</strong> Routine check-ups and hygiene<br><br>For exact availability, call "+phoneInline+". Ask about the cancellation list for sooner slots!",
            "&#x23F0; <strong>Can I Get a Same-Day Appointment?</strong><br><br>For dental emergencies, we do our best to see you the same day:<br><br>&#x2022; Severe toothache<br>&#x2022; Dental abscess with swelling<br>&#x2022; Knocked-out tooth (time-critical!)<br>&#x2022; Broken tooth causing pain<br><br>Call "+phoneInline+" <strong>first thing in the morning</strong> and explain your symptoms. We keep emergency slots available daily.",
            "&#x23F0; <strong>Reducing Wait Times &mdash; Cancellation List</strong><br><br>If you need an appointment sooner than we have available:<br><br>&#x2022; Ask to be added to our <strong>cancellation list</strong><br>&#x2022; When a slot becomes available, we'll call you to offer it<br>&#x2022; Short-notice slots often become available due to cancellations<br>&#x2022; Flexible patients who can come at short notice do best on the list<br><br>Call "+phoneInline+" and ask about the cancellation list.",
            "&#x23F0; <strong>New Patient Waiting Times</strong><br><br>If you're registering as a new patient:<br><br>&#x2022; Call "+phoneInline+" to register &mdash; we'll take some basic details<br>&#x2022; We'll arrange a new patient check-up as soon as we have availability<br>&#x2022; If you have an urgent issue, mention it &mdash; we'll try to prioritise<br>&#x2022; NHS treatment is available from your first appointment<br><br>Don't delay &mdash; the sooner you register, the sooner we can help!"
        ]
    },
    {
        id: 'elderly',
        priority: 0,
        keywords: ['elderly','senior','pensioner','older patient','aging','ageing','retirement','over 65','old age','geriatric','care home'],
        weight: 4,
        responses: [
            "&#x1F9D3; <strong>Dental Care for Older Patients</strong><br><br>&#x2022; Regular check-ups are more important with age (oral cancer, dry mouth, gum disease risk)<br>&#x2022; Dry mouth (from medications) increases decay risk &mdash; we can help manage this<br>&#x2022; Gum recession is common but treatable<br>&#x2022; Denture care and adjustments always available<br>&#x2022; Oral cancer screening included in every check-up<br>&#x2022; If mobility is a concern, please call to discuss &mdash; home visits may be available in exceptional circumstances<br><br>You may qualify for free NHS treatment on benefits. Call "+phoneInline+".",
            "&#x1F9D3; <strong>Dental Care for Older Adults</strong><br><br>As we age, our dental needs change:<br><br>&#x2022; Medications can cause dry mouth &mdash; we'll address this<br>&#x2022; Gum disease and tooth loss risk increases &mdash; more frequent hygiene visits help<br>&#x2022; Dentures may need relining or replacing over time<br>&#x2022; Implant-retained dentures offer more stability if appropriate<br>&#x2022; NHS check-ups remain &#163;27.40 (free if on qualifying benefits)<br><br>We treat every patient with dignity and patience. Call "+phoneInline+".",
            "&#x1F9D3; <strong>Free NHS Dental Treatment for Pensioners</strong><br><br>Many older adults qualify for free NHS dental care:<br><br>&#x2022; Pension Credit recipients: free NHS treatment<br>&#x2022; Income-based JSA or ESA recipients: free treatment<br>&#x2022; NHS Low Income Scheme (HC1/HC2): reduced or free charges based on income<br><br>If you're unsure whether you qualify, pick up an HC1 form at the practice or call "+phoneInline+". It's always worth checking!",
            "&#x1F9D3; <strong>Dentures in Older Age</strong><br><br>Dentures require ongoing attention to remain comfortable and functional:<br><br>&#x2022; Gum and bone shrink over time &mdash; dentures may need relining every few years<br>&#x2022; Bring your denture to every check-up for inspection<br>&#x2022; Oral hygiene still matters without natural teeth (gum health, oral cancer screening)<br>&#x2022; We can repair broken or ill-fitting dentures promptly<br><br>Call "+phoneInline+" if your denture is causing discomfort.",
            "&#x1F9D3; <strong>Maintaining Good Oral Health in Later Life</strong><br><br>Practical tips for older patients:<br><br>&#x2022; Electric toothbrush recommended if arthritis makes brushing difficult<br>&#x2022; Floss picks or water flossers are easier than traditional floss<br>&#x2022; Dry mouth (very common with older medications) &mdash; use Biotène products and drink plenty of water<br>&#x2022; Check for white/red patches in the mouth monthly &mdash; oral cancer risk increases with age<br>&#x2022; Regular check-ups every 6 months are especially important<br><br>Call "+phoneInline+" to book."
        ]
    },
    {
        id: 'complaints',
        priority: 0,
        keywords: ['complaint','complain','unhappy','unsatisfied','dissatisfied','problem with treatment','issue with dentist','not happy','something went wrong','feedback','raise concern','formal complaint'],
        weight: 4,
        responses: [
            "&#x1F4DD; <strong>Feedback &amp; Complaints</strong><br><br>We're sorry to hear you've had a less than perfect experience. All feedback is taken very seriously.<br><br><strong>How to raise a concern:</strong><br>&#x2022; <strong>Call us:</strong> "+phoneInline+" &mdash; ask to speak to the Practice Manager<br>&#x2022; <strong>In writing:</strong> 276a Heathway, Dagenham, Essex, RM10 8QS<br><br>We'll investigate thoroughly and respond in writing within <strong>10 working days</strong>.<br><br>If you're not satisfied with our response, you can contact the <strong>Dental Complaints Service</strong> (0208 253 0800) or the <strong>CQC</strong>.",
            "&#x1F4DD; <strong>Raising a Concern</strong><br><br>Please don't hesitate to tell us if something wasn't right. We'd far rather know so we can put it right.<br><br>&#x2022; Call "+phoneInline+" and ask for the Practice Manager<br>&#x2022; Or write to us at 276a Heathway, Dagenham, RM10 8QS<br><br>All complaints are handled confidentially and professionally. Your feedback genuinely helps us improve.",
            "&#x1F4DD; <strong>Escalating a Complaint</strong><br><br>If you're not satisfied with our internal response, you have the right to escalate:<br><br>&#x2022; <strong>Dental Complaints Service:</strong> 0208 253 0800 (independent, free to use)<br>&#x2022; <strong>NHS England:</strong> 0300 311 22 33<br>&#x2022; <strong>Care Quality Commission (CQC):</strong> cqc.org.uk<br>&#x2022; <strong>General Dental Council (GDC):</strong> For fitness to practise concerns &mdash; gdc-uk.org<br><br>We would always prefer to resolve concerns directly. Please call "+phoneInline+" first.",
            "&#x1F4DD; <strong>How We Handle Complaints</strong><br><br>Our complaints process follows NHS guidelines:<br><br>1. Acknowledgement within <strong>3 working days</strong><br>2. Full investigation<br>3. Written response within <strong>10 working days</strong><br>4. Explanation, apology if appropriate, and any corrective action<br><br>All complaints are treated confidentially. Raising a complaint will never affect the care you receive. We take every concern seriously. Call "+phoneInline+".",
            "&#x1F4DD; <strong>Giving Feedback &mdash; Positive or Negative</strong><br><br>We value all feedback &mdash; it helps us improve:<br><br>&#x2022; <strong>Positive:</strong> Leave us a Google review! It genuinely helps new patients find us<br>&#x2022; <strong>Negative:</strong> Call "+phoneInline+" or write to us &mdash; we'll investigate and respond within 10 working days<br>&#x2022; <strong>Suggestions:</strong> Always welcome &mdash; we're constantly looking to improve<br><br>Thank you for helping us become better. We truly appreciate all feedback."
        ]
    },
    {
        id: 'reviews',
        priority: 0,
        keywords: ['review','google review','leave a review','rate us','rating','recommend','testimonial','feedback online','5 star'],
        weight: 3,
        responses: [
            "&#x2B50; <strong>Reviews</strong><br><br>If you've had a positive experience at Heathway Dental, we'd be truly grateful if you could leave us a <strong>Google review</strong>. It helps other patients in Dagenham find quality, trustworthy dental care.<br><br>Thank you so much for your support! &#x1F60A;",
            "&#x2B50; <strong>Love Your Experience?</strong><br><br>Your reviews mean the world to us and help new patients feel confident choosing Heathway Dental.<br><br>A quick <strong>Google review</strong> takes just 2 minutes and makes a huge difference. Thank you in advance! &#x1F60A;",
            "&#x2B50; <strong>Why Reviews Matter to Us</strong><br><br>As a small independent NHS practice, we don't have a big marketing budget &mdash; but we do have great patients!<br><br>Your honest review helps:<br>&#x2022; New patients in Dagenham find a trustworthy local dentist<br>&#x2022; Nervous patients see that we're kind and gentle<br>&#x2022; Families know we're welcoming to children<br><br>A Google review takes 2 minutes and means the world. Thank you! &#x1F60A;",
            "&#x2B50; <strong>Leave Us a Review</strong><br><br>Satisfied with your care at Heathway Dental? We'd be so grateful for a Google review!<br><br>Just search for <strong>'Heathway Dental Surgery Dagenham'</strong> on Google and click 'Write a review'. It takes less than 2 minutes.<br><br>Thank you for your support &mdash; it makes a real difference to our small practice. &#x1F60A;",
            "&#x2B50; <strong>Testimonials</strong><br><br>Don't just take our word for it &mdash; we're proud of our reputation in Dagenham and the local area.<br><br>Check our Google reviews to see what other patients say about:<br>&#x2022; Gentle, caring treatment<br>&#x2022; Great with nervous patients<br>&#x2022; Friendly and welcoming team<br>&#x2022; Excellent NHS care<br><br>We'd love to add your experience to our reviews. Call "+phoneInline+" to become part of our Heathway family!"
        ]
    },

    // ════════════════════════════════════════
    // DENTAL FACTS, MYTHS, JOKES
    // ════════════════════════════════════════
    {
        id: 'dental_facts',
        priority: 0,
        keywords: ['fact','trivia','did you know','interesting fact','tell me something','random fact','fun fact','dental history','dentist history','tell me a fact','dental fact','teeth fact','tooth fact'],
        weight: 4,
        responses: [
            "&#x1F4A1; <strong>Dental Fact:</strong> Tooth enamel is the <strong>hardest substance in the human body</strong> &mdash; even harder than bone! Yet acid can dissolve it in minutes.<br><br>Want another? Just ask!",
            "&#x1F4A1; <strong>Dental Fact:</strong> The average person produces about <strong>10,000 gallons of saliva</strong> in their lifetime. Saliva is your mouth's natural defence against decay &mdash; it neutralises acid and remineralises enamel.<br><br>Want another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> Your teeth are as <strong>unique as your fingerprints</strong>. No two people have the same dental pattern &mdash; it's why dentists can identify individuals.<br><br>Ask me for another!",
            "&#x1F4A1; <strong>Dental Fact:</strong> A snail's mouth contains over <strong>20,000 teeth</strong> &mdash; all on its tongue (called a radula). Imagine the toothpaste bill! &#x1F40C;<br><br>Want more?",
            "&#x1F4A1; <strong>Dental Fact:</strong> The first toothbrush was invented in China in <strong>1498</strong>, using stiff hairs from pigs' necks tied to a bamboo stick. Bristles have improved since then!<br><br>Another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> You'll spend roughly <strong>38.5 days</strong> of your life brushing your teeth. That's time very well spent!<br><br>Want another fact?",
            "&#x1F4A1; <strong>Dental Fact:</strong> <strong>Cheese</strong> is one of the best foods for your teeth. It neutralises mouth acid and contains calcium and phosphate that help remineralise enamel. &#x1F9C0;<br><br>Another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> The first known dentist was an Egyptian named <strong>Hesy-Re</strong>, around 2600 BC. He was described as 'the greatest of those who deal with teeth'.<br><br>Want more?",
            "&#x1F4A1; <strong>Dental Fact:</strong> Tooth decay is the <strong>most common chronic disease in children</strong> globally &mdash; yet it's almost entirely preventable with fluoride toothpaste, flossing, and regular check-ups!<br><br>Another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> The blue whale is the <strong>largest animal on Earth, yet has no teeth</strong> at all &mdash; it uses baleen plates to filter food. Humans make do with just 32 adult teeth.<br><br>Want another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> <strong>Sugar-free chewing gum</strong> (especially with xylitol) actually helps protect teeth. Chewing stimulates saliva flow which neutralises acid and washes away bacteria.<br><br>Another?",
            "&#x1F4A1; <strong>Dental Fact:</strong> In the 18th century, it was fashionable among wealthy Europeans to have the teeth of <strong>executed criminals or fallen soldiers transplanted into their own jaws</strong>. Needless to say, it rarely worked!<br><br>More?"
        ]
    },
    {
        id: 'dental_myths',
        priority: 0,
        keywords: ['myth','is it true','true or false','old wives tale','dental myth','heard that','is it a myth','debunk','myth that','bust a myth','dental myths','tooth myths','common myths','is it really true','i heard that'],
        weight: 5,
        responses: [
            "&#x274C; <strong>Myth:</strong> \"White teeth = healthy teeth\"<br>&#x2705; <strong>Truth:</strong> Tooth colour varies naturally between people. Perfectly white teeth can still have decay or gum disease hiding beneath the surface. Regular check-ups matter far more than colour.<br><br>Want to bust another myth?",
            "&#x274C; <strong>Myth:</strong> \"Sugar directly causes cavities\"<br>&#x2705; <strong>Truth:</strong> Not quite. It's the bacteria in your mouth that <em>feed</em> on sugar and produce acid that attacks enamel. How <em>often</em> you have sugar matters more than how much in one sitting.<br><br>Another myth?",
            "&#x274C; <strong>Myth:</strong> \"Brushing harder cleans better\"<br>&#x2705; <strong>Truth:</strong> Aggressive brushing actually damages your enamel and gum tissue. Gentle circular motions with a soft brush are far more effective and safer.<br><br>Another?",
            "&#x274C; <strong>Myth:</strong> \"Baby teeth don't matter because they fall out\"<br>&#x2705; <strong>Truth:</strong> Baby teeth hold space for permanent teeth, affect speech development, aid chewing, and influence jaw development. Cavities in baby teeth can also cause pain and infection. They absolutely matter!<br><br>Want another?",
            "&#x274C; <strong>Myth:</strong> \"If it doesn't hurt, there's no problem\"<br>&#x2705; <strong>Truth:</strong> Many dental problems &mdash; including decay, gum disease, and even oral cancer &mdash; are painless until very advanced. Regular check-ups are essential for early detection.<br><br>Another myth?",
            "&#x274C; <strong>Myth:</strong> \"You shouldn't brush bleeding gums\"<br>&#x2705; <strong>Truth:</strong> Bleeding gums usually indicate gingivitis (early gum disease). The answer is to brush <em>more carefully</em>, not stop. Avoiding brushing makes the problem much worse.<br><br>Another?",
            "&#x274C; <strong>Myth:</strong> \"Root canals are extremely painful\"<br>&#x2705; <strong>Truth:</strong> Modern root canal treatment is carried out under effective local anaesthetic. Most patients report it feeling similar to a filling. It's the <em>infection before</em> treatment that hurts &mdash; the treatment relieves the pain!<br><br>Another?",
            "&#x274C; <strong>Myth:</strong> \"You only need to see the dentist when something hurts\"<br>&#x2705; <strong>Truth:</strong> By the time most dental problems cause pain, they're often more advanced (and expensive to fix). Regular check-ups every 6&ndash;12 months catch problems while they're still small.<br><br>Want another?"
        ]
    },
    {
        id: 'jokes',
        priority: 0,
        keywords: ['joke','funny','laugh','humour','humor','make me laugh','tell me a joke','cheer me up','bored','dental joke','dentist joke'],
        weight: 3,
        responses: [
            "Why did the king go to the dentist? <br><strong>To get his teeth crowned!</strong> &#x1F451;<br><br>&#x1F604; Want another?",
            "What does the dentist of the year get? <br><strong>A little plaque!</strong> &#x1F3C6;<br><br>&#x1F604; Another?",
            "What time is a dental appointment? <br><strong>Tooth-hurty!</strong> (2:30) &#x1F570;<br><br>&#x1F604; Want another?",
            "What do you call a bear with no teeth? <br><strong>A gummy bear!</strong> &#x1F43B;<br><br>&#x1F604; Another?",
            "Why did the deer need braces? <br><strong>Because it had buck teeth!</strong> &#x1F98C;<br><br>&#x1F604; Want another?",
            "What did the tooth say to the departing dentist? <br><strong>\"Fill me in when you get back!\"</strong> &#x1F60A;<br><br>&#x1F604; Another?",
            "Why did the smartphone go to the dentist? <br><strong>It had Bluetooth problems!</strong> &#x1F4F1;<br><br>&#x1F604; Want another?",
            "What does a dentist call an astronaut's cavity? <br><strong>A black hole!</strong> &#x1F680;<br><br>&#x1F604; Another?",
            "What's a dentist's favourite animal? <br><strong>A molar bear!</strong> &#x1F43B;<br><br>&#x1F604; Want another?",
            "What's a dentist's favourite day of the week? <br><strong>Toothsday!</strong> &#x1F9B7;<br><br>&#x1F604; Another?",
            "I told my dentist I wanted a crown. She replied: <br><strong>\"You're absolutely royalty to us!\"</strong> &#x1F451;<br><br>&#x1F604; Want another?",
            "What did one tooth say to the other? <br><strong>\"Get your cap on, the dentist is taking us out tonight!\"</strong> &#x1F9B7;<br><br>&#x1F604; Another?",
            "How do you fix a broken tooth? <br><strong>With toothpaste, of course!</strong> &#x1F604;<br><br>Want another?",
            "Patient: Doctor, I have yellow teeth. What should I do?<br>Dentist: <strong>Wear a brown tie.</strong> &#x1F454;<br><br>&#x1F604; Want another?"
        ]
    },

    // ════════════════════════════════════════
    // CONTACT & MISC
    // ════════════════════════════════════════
    {
        id: 'contact',
        priority: 0,
        keywords: ['phone','call us','contact','email','reach','get in touch','speak to someone','talk to','how to contact','reception','front desk'],
        weight: 5,
        responses: [
            "&#x1F4DE; <strong>Contact Us</strong><br><br><strong>Phone:</strong> "+phone+"<br><strong>Address:</strong> 276a Heathway, Dagenham, Essex, RM10 8QS<br><strong>Hours:</strong> Mon&ndash;Fri 9am&ndash;1pm, 2pm&ndash;5pm<br><br>Visit our <a href='heathway-contact.html' style='color:var(--teal)'>Contact page</a> for more details.",
            "&#x1F4DE; <strong>Get in Touch</strong><br><br>The best way to reach us is by phone:<br>"+phone+"<br><br>Lines are open <strong>Monday to Friday, 9am&ndash;1pm and 2pm&ndash;5pm</strong> (closed 1&ndash;2pm for lunch).<br><br>Our reception team is friendly and helpful. Don't be shy &mdash; give us a call!",
            "&#x1F4DE; <strong>How to Reach Us</strong><br><br>&#x1F4DE; <strong>Phone:</strong> "+phone+"<br>&#x1F4CD; <strong>Address:</strong> 276a Heathway, Dagenham, Essex, RM10 8QS<br>&#x1F553; <strong>Hours:</strong> Mon&ndash;Fri 9am&ndash;5pm (lunch 1&ndash;2pm)<br><br>For emergencies outside office hours, call the same number &mdash; our voicemail will advise on out-of-hours options.<br><br>Visit our full <a href='heathway-contact.html' style='color:var(--teal)'>Contact page</a>.",
            "&#x1F4DE; <strong>Can't Get Through?</strong><br><br>If the line is busy, please try again a little later:<br><br>&#x2022; Phones are busiest first thing in the morning<br>&#x2022; Mid-morning (10&ndash;11am) is often quieter<br>&#x2022; We close for lunch 1&ndash;2pm<br>&#x2022; Afternoon (2&ndash;4pm) is also a good time to call<br><br>Our number is "+phoneInline+". We look forward to hearing from you!",
            "&#x1F4DE; <strong>Visiting Us</strong><br><br>We're conveniently located at <strong>276a Heathway, Dagenham, Essex, RM10 8QS</strong>:<br><br>&#x1F687; Dagenham Heathway tube station (District Line) &mdash; 3 minute walk<br>&#x1F68C; Bus routes 173, 174, 175<br>&#x1F697; Street parking available on Heathway<br><br>Call "+phoneInline+" to book before visiting. We can't accept walk-ins for treatment without an appointment."
        ]
    },
    {
        id: 'insurance',
        priority: 0,
        keywords: ['insurance','dental insurance','bupa','vitality','axa','aviva','simplyhealth','denplan','health plan','dental plan','private insurance','insurance cover'],
        weight: 4,
        responses: [
            "&#x1F4BC; <strong>Dental Insurance</strong><br><br>We can treat patients with dental insurance plans, including many major providers. Please call "+phoneInline+" before your appointment and mention your insurance provider so we can check compatibility and billing arrangements.",
            "&#x1F4BC; <strong>Insurance Plans</strong><br><br>If you have dental insurance through an employer or private plan, please call "+phoneInline+" to discuss. We'll confirm whether we can accept your plan and how billing works.<br><br>We also offer our own flexible payment plans for larger private treatments.",
            "&#x1F4BC; <strong>Do I Need Dental Insurance?</strong><br><br>For most NHS patients, dental insurance isn't necessary:<br><br>&#x2022; NHS charges are fixed and capped at &#163;326.70 per course of treatment<br>&#x2022; Emergency treatment is available at NHS charges<br>&#x2022; Many people are exempt from charges entirely<br><br>Insurance is more useful if you have a lot of private treatment. For NHS patients, regular check-ups are far more cost-effective than insurance premiums. Call "+phoneInline+" to discuss.",
            "&#x1F4BC; <strong>Denplan, Bupa, and Other Dental Plans</strong><br><br>We can treat patients with various dental insurance and health plans. Please call "+phoneInline+" before your appointment to confirm:<br><br>&#x2022; Whether your specific plan is accepted<br>&#x2022; What your plan covers at our practice<br>&#x2022; How billing is handled<br>&#x2022; Any authorisation requirements<br><br>Different plans have different terms &mdash; always call ahead to avoid any surprises.",
            "&#x1F4BC; <strong>NHS Charges vs Private Insurance</strong><br><br>Understanding the difference helps you choose:<br><br>&#x2022; <strong>NHS:</strong> Fixed charges (&#163;27.40 / &#163;75.30 / &#163;326.70) regardless of treatment complexity<br>&#x2022; <strong>Private:</strong> Market rates, varies by treatment and practice<br>&#x2022; <strong>Dental insurance:</strong> Covers some or all private costs, subject to policy terms<br><br>For most people, NHS treatment provides excellent value. Call "+phoneInline+" to discuss what's best for your situation."
        ]
    },
    {
        id: 'off_topic',
        priority: 0,
        keywords: ['weather','football','soccer','cricket','rugby','pizza','burger','dog','cat','pet','movie','film','music','song','game','love','girlfriend','boyfriend','wife','husband','politics','trump','election','news','bitcoin','crypto','stocks'],
        weight: 2,
        responses: [
            "Ha! That's a bit outside my area of expertise. &#x1F604; I'm best with dental topics &mdash; but I do know that <strong>smiling uses fewer muscles than frowning</strong>, so keep smiling! How can I help with your teeth?",
            "I wish I could help with that, but I'm trained in teeth, not world affairs! &#x1F9B7; Anything dental I can assist with?",
            "I'm just a humble dental assistant &mdash; I'll leave that to the experts! &#x1F604; Now, about those teeth of yours &mdash; anything I can help with?",
            "Haha, not my area I'm afraid! I'm fully trained in teeth but quite hopeless at everything else. &#x1F9B7; Ask me anything dental and I'll do my best!",
            "I'll leave that to someone more qualified! &#x1F604; My expertise begins and ends with teeth. Can I help you with anything dental today?",
            "Outside my remit entirely! But if you've got a dental question, I'm all ears &mdash; and all gums. &#x1F9B7; What can I help you with?",
            "That's above my pay grade! I'm a dental assistant AI &mdash; I live and breathe teeth, not current affairs. &#x1F604; How can I help with your smile today?",
            "Not quite my specialty! I'm best placed to help with appointments, NHS pricing, dental treatments, and oral health advice. Give me a dental question and I'll shine! &#x1F9B7;"
        ]
    },
    {
        id: 'follow_up',
        priority: 0,
        keywords: ['how much','how much does it cost','how much is it','what does it cost','more info','tell me more','and the address','where is that','when is that','what about','more about','can you explain','what else','anything else to know','go on','continue'],
        weight: 2,
        responses: [
            "Happy to give you more details! Could you let me know which topic you'd like more information on? For example:<br>&#x2022; Pricing for a specific treatment<br>&#x2022; More about a particular service<br>&#x2022; Location and how to get here<br><br>Or call "+phoneInline+" and our team can go through everything with you.",
            "Of course! What would you like to know more about? I can go deeper on:<br>&#x2022; NHS charges and what each band covers<br>&#x2022; Any of our treatments<br>&#x2022; Location and transport<br>&#x2022; Our team<br><br>Just ask!",
            "Happy to go deeper! Here are some topics I can expand on:<br>&#x2022; Treatment costs and what NHS bands cover<br>&#x2022; The process for any specific treatment<br>&#x2022; How to register or book<br>&#x2022; Aftercare and recovery advice<br><br>Or for a direct chat, call "+phoneInline+" &mdash; our reception team knows everything!",
            "Absolutely &mdash; ask away! I'm here to help with any dental question, whether it's about our services, NHS pricing, how a treatment works, or oral health advice.<br><br>Or if you'd rather speak to someone directly, call "+phoneInline+". Mon&ndash;Fri, 9am&ndash;5pm (closed for lunch 1&ndash;2pm).",
            "Of course! Just type what you'd like more information on &mdash; treatments, prices, opening hours, how to register, aftercare advice, or anything else dental-related. I'm here to help! &#x1F60A;<br><br>Or call "+phoneInline+" for a direct conversation with our team."
        ]
    },
    {
        id: 'clarification',
        priority: 0,
        keywords: ['what','huh','eh','pardon','sorry','come again','repeat that','again','didn\'t understand','don\'t understand','don\'t get it','confused','not sure what you mean','what do you mean'],
        weight: 2,
        responses: [
            "No worries at all! Could you rephrase that? I can help with appointments, services, pricing, dental advice, and much more. Or try one of the quick suggestions! &#x1F60A;",
            "Sorry if that wasn't clear! Try asking me something like:<br>&#x2022; \"How much does a filling cost?\"<br>&#x2022; \"What are your opening hours?\"<br>&#x2022; \"How do I book an appointment?\"<br>&#x2022; \"Tell me about dentures\"<br><br>Or call "+phoneInline+" for direct help.",
            "No problem! Let's try again. Some examples of what I can help with:<br>&#x2022; \"Do you accept NHS patients?\"<br>&#x2022; \"What's included in a check-up?\"<br>&#x2022; \"I have a toothache &mdash; what should I do?\"<br>&#x2022; \"How do I get to the practice?\"<br><br>Ask away &mdash; there's no such thing as a silly dental question! &#x1F60A;",
            "Let me help &mdash; could you try rewording your question? I can answer things like:<br>&#x2022; Costs and pricing<br>&#x2022; Specific treatments<br>&#x2022; Oral hygiene advice<br>&#x2022; Emergency situations<br>&#x2022; Booking and registration<br><br>Or speak to our team directly on "+phoneInline+"."
        ]
    },

    // ════════════════════════════════════════
    // NEW EXPANDED TOPICS
    // ════════════════════════════════════════
    {
        id: 'teeth_grinding',
        priority: 0,
        keywords: ['grinding','bruxism','clench','clenching','grind teeth','grinding at night','jaw clenching','worn teeth','teeth wearing down','worn enamel','bite guard','occlusal guard','tmd','tmj','jaw pain','jaw ache','jaw clicking','clicking jaw','jaw locking','lockjaw'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Teeth Grinding (Bruxism)</strong><br><br>Bruxism is very common, especially during sleep, and can cause serious damage over time:<br><br>&#x2022; Worn, flattened, or cracked teeth<br>&#x2022; Jaw pain and morning headaches<br>&#x2022; Facial muscle soreness<br>&#x2022; Clicking or locking jaw (TMJ disorder)<br><br><strong>Treatment:</strong> A custom-made <strong>occlusal splint (night guard)</strong> protects your teeth while you sleep. We can also advise on stress reduction and jaw exercises.<br><br>Book an assessment: "+phoneInline,
            "&#x1F9B7; <strong>Jaw Pain &amp; Clicking (TMJ)</strong><br><br>Jaw pain, clicking, or difficulty opening wide may indicate TMJ (temporomandibular joint) disorder:<br><br>&#x2022; Often caused or worsened by teeth grinding or clenching<br>&#x2022; Stress is a major trigger<br>&#x2022; A custom night guard relieves pressure on the joint<br>&#x2022; Physiotherapy and jaw exercises can help<br>&#x2022; In severe cases, a specialist referral may be needed<br><br>Call "+phoneInline+" to discuss your symptoms and book an assessment.",
            "&#x1F9B7; <strong>Night Guards for Grinding</strong><br><br>If you grind or clench your teeth, a custom occlusal splint is the most effective protection:<br><br>&#x2022; Custom-made to fit your teeth precisely (not an over-the-counter boil-and-bite)<br>&#x2022; Worn at night (or during the day if you clench during the day)<br>&#x2022; Protects enamel, fillings, crowns, and your jaw joint<br>&#x2022; Often recommended before any cosmetic work<br>&#x2022; NHS Band 3 or private &mdash; ask at your appointment<br><br>Call "+phoneInline+" to discuss."
        ]
    },
    {
        id: 'mouth_cancer',
        priority: 0,
        keywords: ['mouth cancer','oral cancer','cancer check','cancer screening','ulcer not healing','lump in mouth','lump on tongue','white patch','red patch','leukoplakia','erythroplakia','cancer signs','cancer symptoms mouth','throat cancer','tongue lump'],
        weight: 6,
        responses: [
            "&#x1F50D; <strong>Oral Cancer Screening</strong><br><br>We screen for oral cancer at <strong>every check-up</strong> &mdash; it takes just a few minutes and is included in your NHS Band 1 charge.<br><br><strong>Symptoms to be aware of:</strong><br>&#x2022; Ulcer or sore that doesn't heal within 3 weeks<br>&#x2022; Unexplained lump or swelling in the mouth or neck<br>&#x2022; White or red patch inside the mouth<br>&#x2022; Difficulty swallowing or a persistent sore throat<br>&#x2022; Numbness or pain in the tongue or jaw<br><br><strong>Act quickly if you notice any of these.</strong> Early detection dramatically improves outcomes. Call "+phoneInline+" today.",
            "&#x1F50D; <strong>Mouth Cancer &mdash; Risk Factors</strong><br><br>&#x2022; Smoking and tobacco use (major risk)<br>&#x2022; Excessive alcohol<br>&#x2022; HPV (Human Papillomavirus) &mdash; especially in younger patients<br>&#x2022; Sun exposure (lip cancer)<br>&#x2022; A diet low in fruit and vegetables<br><br>Oral cancer has a <strong>90%+ survival rate when caught early</strong>. Don't miss your check-ups &mdash; oral cancer screening is included every time. Call "+phoneInline+" to book.",
            "&#x1F50D; <strong>Worried About a Lump or Ulcer?</strong><br><br>Any lump, ulcer, or sore patch in your mouth that doesn't heal within <strong>3 weeks</strong> should be checked by a dentist urgently.<br><br>&#x2022; It's most likely nothing serious &mdash; but it must be checked<br>&#x2022; We can refer you for a specialist 2-week-wait appointment if needed<br>&#x2022; Do not wait and see &mdash; early referral is always safer<br><br>Call "+phoneInline+" today and let us know your concern. We'll prioritise your appointment."
        ]
    },
    {
        id: 'sedation',
        priority: 0,
        keywords: ['sedation','sedated','sleep dentistry','conscious sedation','IV sedation','nervous sedation','dental phobia','phobia','hate dentist','terrified of dentist','scared of injection','scared of needle','needle phobia','dental anxiety treatment','relax at dentist','calm dentist'],
        weight: 5,
        responses: [
            "&#x1F499; <strong>Nervous Patients &amp; Dental Anxiety</strong><br><br>Dental anxiety is extremely common &mdash; you are not alone, and we are experienced in helping nervous patients:<br><br>&#x2022; Tell us you're nervous when you call &mdash; we'll give you extra time<br>&#x2022; We always explain what we're doing before we do it<br>&#x2022; We use gentle techniques and can stop at any time<br>&#x2022; Topical numbing gel is applied before any injection<br>&#x2022; Our dentists are patient, calm, and non-judgmental<br><br>Call "+phoneInline+" and let our team know &mdash; your comfort is our priority.",
            "&#x1F499; <strong>Sedation Options</strong><br><br>For patients with severe anxiety, sedation options may be available. Please call "+phoneInline+" to discuss your situation and what might be suitable for you:<br><br>&#x2022; <strong>Oral sedation:</strong> A tablet taken before your appointment to reduce anxiety<br>&#x2022; <strong>Inhalation sedation (happy gas):</strong> Nitrous oxide &mdash; relaxing but you remain awake<br>&#x2022; <strong>IV sedation:</strong> A deeper level of sedation &mdash; usually requires referral to a specialist clinic<br><br>We will always discuss the options that are right for you.",
            "&#x1F499; <strong>Tips for Nervous Dental Patients</strong><br><br>&#x2022; Tell us &mdash; we can't help if we don't know<br>&#x2022; Bring a trusted person with you for support<br>&#x2022; Agree a signal (raise your hand) to pause treatment at any time<br>&#x2022; Headphones and music can help during treatment<br>&#x2022; Book a morning appointment when you're freshest<br>&#x2022; Avoid caffeine before your appointment<br>&#x2022; Focus on slow, deep breathing in the chair<br><br>The more you attend, the easier it gets &mdash; avoidance makes anxiety worse. Call "+phoneInline+", we'll look after you."
        ]
    },
    {
        id: 'payment',
        priority: 0,
        keywords: ['payment plan','pay monthly','finance','spread cost','pay in installments','affordable','how to pay','card payment','cash','payment options','pay for treatment','private fees','cost of treatment','quote'],
        weight: 5,
        responses: [
            "&#x1F4B3; <strong>Payment Options</strong><br><br>&#x2022; <strong>NHS patients:</strong> Pay standard NHS bands (Band 1: &#163;27.40, Band 2: &#163;75.30, Band 3: &#163;326.70) or nothing if you're exempt<br>&#x2022; <strong>Private patients:</strong> Treatment quoted in advance at your consultation<br>&#x2022; We accept card payments (debit and credit)<br>&#x2022; Please speak to reception about any payment concerns &mdash; we'll always try to help<br><br>Call "+phoneInline+" for a quote on any private treatment.",
            "&#x1F4B3; <strong>NHS Exemptions &mdash; Free Dental Care</strong><br><br>You may be entitled to <strong>free NHS dental treatment</strong> if you are:<br><br>&#x2022; Under 18 (or under 19 in full-time education)<br>&#x2022; Pregnant or had a baby in the last 12 months<br>&#x2022; Receiving certain benefits (Income Support, UC, JSA, ESA, Pension Credit)<br>&#x2022; Holding a valid HC2 certificate<br>&#x2022; An NHS hospital dental patient<br><br>Tell us at your appointment &mdash; bring proof if you have it. Claiming exemption you're not entitled to is an offence.",
            "&#x1F4B3; <strong>How Much Does Private Treatment Cost?</strong><br><br>Private treatment is quoted on a case-by-case basis depending on complexity and materials used. Examples:<br><br>&#x2022; Composite (white) filling: varies by size and tooth<br>&#x2022; Porcelain crown: quoted at consultation<br>&#x2022; Tooth whitening: quoted at consultation<br>&#x2022; Veneers: quoted per tooth<br><br>The best way to get an accurate quote is to call "+phoneInline+" and book a private consultation. We'll assess your needs and give you a full written quote with no obligation."
        ]
    },
    {
        id: 'whitening',
        priority: 0,
        keywords: ['whitening','whiten','bleach teeth','teeth bleaching','white teeth','tooth whitening','zoom','enlighten','staining','yellow teeth','discoloured teeth','how to whiten','whiter teeth','whitening trays','whitening kit'],
        weight: 5,
        responses: [
            "&#x2728; <strong>Teeth Whitening</strong><br><br>We offer professional teeth whitening which is safe, effective, and much stronger than any over-the-counter product:<br><br>&#x2022; Custom-made whitening trays fitted to your teeth<br>&#x2022; Professional-grade whitening gel (not available in shops)<br>&#x2022; Used at home, at your own pace<br>&#x2022; Results typically last 1&ndash;3 years with occasional top-ups<br>&#x2022; <strong>Private treatment only</strong> &mdash; not available on the NHS<br>&#x2022; Teeth must be healthy before whitening &mdash; a check-up is required first<br><br>Call "+phoneInline+" for a consultation and quote.",
            "&#x2728; <strong>Is Teeth Whitening Safe?</strong><br><br>Yes &mdash; when performed or prescribed by a registered dentist:<br><br>&#x2022; It's illegal for non-dentists to perform teeth whitening in the UK<br>&#x2022; Avoid beauty salons and home kits with unlicensed products &mdash; these can cause chemical burns and nerve damage<br>&#x2022; Our professional whitening uses regulated, safe concentrations<br>&#x2022; Some temporary sensitivity is normal and resolves within a few days<br><br>Always go to a dentist for whitening. Call "+phoneInline+" to book.",
            "&#x2728; <strong>Whitening vs Staining</strong><br><br>Whitening works on natural tooth enamel &mdash; here's what you need to know:<br><br>&#x2022; Whitening does <strong>not</strong> change the colour of crowns, veneers, or fillings<br>&#x2022; If you have visible restorations, these may need replacing after whitening to match<br>&#x2022; Surface staining (coffee, tea, wine) responds best<br>&#x2022; Intrinsic staining (tetracycline, fluorosis) is harder to treat<br>&#x2022; Whitening works best on natural, lightly stained teeth<br><br>Book a whitening consultation: "+phoneInline
        ]
    },
    {
        id: 'veneers',
        priority: 0,
        keywords: ['veneers','veneer','composite veneer','porcelain veneer','smile makeover','smile design','cosmetic smile','bonding','composite bonding','edge bonding','chipped front tooth','gap in front teeth','diastema','cosmetic dentistry','smile','hollywood smile'],
        weight: 5,
        responses: [
            "&#x1FA77; <strong>Veneers &amp; Smile Makeovers</strong><br><br>Veneers are thin shells bonded to the front of teeth to transform their shape, size, or colour:<br><br>&#x2022; <strong>Composite veneers/bonding:</strong> Built up chair-side in one visit, more affordable, repairable<br>&#x2022; <strong>Porcelain veneers:</strong> Lab-made, highly aesthetic, more durable<br>&#x2022; Ideal for chipped, gapped, slightly misaligned, or discoloured teeth<br>&#x2022; <strong>Private treatment only</strong><br><br>Call "+phoneInline+" for a cosmetic consultation and personalised quote.",
            "&#x1FA77; <strong>Composite Bonding</strong><br><br>One of the most popular and versatile cosmetic treatments:<br><br>&#x2022; Tooth-coloured resin applied and sculpted directly on the tooth<br>&#x2022; Can close gaps, fix chips, reshape teeth, improve colour<br>&#x2022; Usually completed in a single appointment<br>&#x2022; No drilling required in many cases<br>&#x2022; More affordable than porcelain veneers<br>&#x2022; Can be repaired easily if damaged<br><br>Ask about our cosmetic consultation at "+phoneInline+".",
            "&#x1FA77; <strong>Am I a Candidate for Veneers?</strong><br><br>Most people with healthy teeth can have veneers. They're best for:<br><br>&#x2022; Permanently discoloured teeth<br>&#x2022; Chipped or worn front teeth<br>&#x2022; Minor gaps or misalignment<br>&#x2022; Uneven or short teeth<br><br>Veneers are <strong>not suitable</strong> if you grind your teeth heavily (they may fracture), or if you have significant tooth decay or gum disease that needs treating first.<br><br>Book a consultation: "+phoneInline
        ]
    },
    {
        id: 'implants',
        priority: 0,
        keywords: ['implant','dental implant','missing tooth','replace tooth','replace missing tooth','tooth replacement','permanent false tooth','titanium implant','implant crown','bone graft','implant bridge','all on four','all-on-4','teeth in a day'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Dental Implants</strong><br><br>Dental implants are the gold standard for replacing missing teeth:<br><br>&#x2022; A titanium post is placed into the jawbone<br>&#x2022; It fuses with the bone over 3&ndash;6 months (osseointegration)<br>&#x2022; A crown, bridge, or denture is then attached<br>&#x2022; Looks, feels, and functions like a natural tooth<br>&#x2022; Can last a lifetime with proper care<br>&#x2022; <strong>Private treatment only</strong><br><br>Call "+phoneInline+" for a consultation and quote.",
            "&#x1F9B7; <strong>Am I Suitable for Implants?</strong><br><br>Most adults in good general health can have implants, but the following affect suitability:<br><br>&#x2022; Sufficient bone volume (bone grafting may be needed if bone has been lost)<br>&#x2022; Good gum health<br>&#x2022; Controlled medical conditions (diabetes, blood thinners require careful planning)<br>&#x2022; Non-smoker (smoking doubles implant failure rates)<br>&#x2022; Committed to excellent oral hygiene long-term<br><br>A full assessment is needed to confirm suitability. Call "+phoneInline+".",
            "&#x1F9B7; <strong>Implant vs Bridge vs Denture</strong><br><br>Comparing options for replacing a missing tooth:<br><br>&#x2022; <strong>Implant:</strong> Best long-term outcome, no effect on adjacent teeth, most natural, higher cost<br>&#x2022; <strong>Bridge:</strong> Fixed, looks natural, quicker, requires shaving adjacent teeth<br>&#x2022; <strong>Denture:</strong> Removable, lowest cost, less natural feel, may affect bone resorption<br><br>The best choice depends on your clinical situation, bone levels, and budget. Call "+phoneInline+" to discuss your options."
        ]
    },
    {
        id: 'parking_transport',
        priority: 0,
        keywords: ['parking','park','bus','tube','station','train','dagenham heathway','how to get','directions','transport','travel to','getting to','where are you','find you','nearest station','how far','postcode','rm10'],
        weight: 5,
        responses: [
            "&#x1F4CD; <strong>Finding Us</strong><br><br><strong>The Heathway Dental Surgery</strong><br>276a Heathway, Dagenham, Essex RM10 8QS<br><br>&#x1F687; <strong>Tube:</strong> Dagenham Heathway station (District Line) &mdash; 5-minute walk<br>&#x1F68C; <strong>Bus:</strong> Routes 5, 62, 148, 174 stop on Heathway<br>&#x1F697; <strong>By car:</strong> Street parking available on Heathway and surrounding roads<br>&#x1F3E5; We are on the main Heathway shopping road<br><br>Any questions? Call "+phoneInline+".",
            "&#x1F4CD; <strong>Transport &amp; Parking</strong><br><br>&#x2022; <strong>Address:</strong> 276a Heathway, Dagenham RM10 8QS<br>&#x2022; <strong>Nearest station:</strong> Dagenham Heathway (District Line) &mdash; 5 min walk<br>&#x2022; <strong>Buses:</strong> Several routes run along Heathway<br>&#x2022; <strong>Parking:</strong> On-street parking nearby<br>&#x2022; <strong>Disabled access:</strong> Please call us to discuss access requirements<br><br>Call "+phoneInline+" if you need specific directions.",
            "&#x1F4CD; <strong>Getting to Heathway Dental</strong><br><br>We're conveniently located on the main Heathway shopping road in Dagenham, East London.<br><br>&#x2022; <strong>Tube:</strong> Dagenham Heathway (District Line) &mdash; just 5 minutes on foot<br>&#x2022; <strong>Car:</strong> Use postcode <strong>RM10 8QS</strong> for sat-nav<br>&#x2022; <strong>Parking:</strong> Street parking on Heathway and side roads<br>&#x2022; <strong>Bus:</strong> Well served by multiple routes<br><br>Can't find us? Call "+phoneInline+" and we'll guide you in."
        ]
    },
    {
        id: 'nhs_availability',
        priority: 0,
        keywords: ['nhs dentist','nhs available','nhs places','taking nhs','accepting nhs','nhs patients','find nhs dentist','nhs registration','are you nhs','do you take nhs','nhs check up','nhs treatment'],
        weight: 6,
        responses: [
            "&#x1F4B7; <strong>NHS Patients</strong><br><br>Yes! We welcome both <strong>NHS and private patients</strong>. To register as a new NHS patient:<br><br>&#x2022; Call us on "+phoneInline+"<br>&#x2022; NHS places are subject to availability &mdash; please enquire when calling<br>&#x2022; Bring photo ID to your first appointment<br>&#x2022; Children are always welcome on the NHS<br><br>Call "+phoneInline+" to check current NHS availability.",
            "&#x1F4B7; <strong>Are You Taking New NHS Patients?</strong><br><br>We do offer NHS dentistry. NHS availability can change, so the best thing to do is call us directly on "+phoneInline+" to check current availability and register.<br><br>NHS charges are:<br>&#x2022; Band 1 (check-up): &#163;27.40<br>&#x2022; Band 2 (fillings, extractions): &#163;75.30<br>&#x2022; Band 3 (crowns, dentures): &#163;326.70<br>&#x2022; Free if you qualify for an exemption",
            "&#x1F4B7; <strong>NHS vs Private at Heathway</strong><br><br>We offer both options:<br><br>&#x2022; <strong>NHS:</strong> Set charge bands, standardised materials and treatments covered by the NHS<br>&#x2022; <strong>Private:</strong> More appointment flexibility, wider material choices, cosmetic treatments, and personalised care<br><br>Many patients use NHS for routine care and pay privately for cosmetic work. Call "+phoneInline+" to discuss the best option for you."
        ]
    },
    {
        id: 'lost_filling_crown',
        priority: 8,
        keywords: ['lost filling','filling fell out','crown fell off','crown came off','lost crown','filling came out','broken filling','tooth broken','piece of tooth','chipped tooth','cracked tooth'],
        weight: 7,
        responses: [
            "&#x26A0;&#xFE0F; <strong>Lost Filling or Crown</strong><br><br>Don't worry &mdash; this is very common! Here's what to do:<br><br>&#x2022; <strong>Lost crown:</strong> Keep the crown if you have it (don't throw it away). Try dental cement (from a pharmacy) to temporarily re-seat it<br>&#x2022; <strong>Lost filling:</strong> The tooth may be sensitive &mdash; sugar-free chewing gum or dental cement can temporarily protect it<br>&#x2022; Avoid very hot, cold, or hard foods on the affected tooth<br>&#x2022; Call us as soon as possible on "+phoneInline+" to book an urgent appointment<br><br>We'll repair it quickly &mdash; call us now!",
            "&#x26A0;&#xFE0F; <strong>Filling Fell Out?</strong><br><br>Call us on "+phoneInline+" for an urgent appointment.<br><br>In the meantime:<br>&#x2022; Rinse the area gently with warm salt water<br>&#x2022; A temporary filling kit (from any pharmacy) can protect the tooth until you're seen<br>&#x2022; Avoid chewing on that side<br>&#x2022; Take normal pain relief if the tooth is sensitive<br><br>Don't leave it too long &mdash; an unprotected tooth can decay or crack further.",
            "&#x26A0;&#xFE0F; <strong>Crown Came Off?</strong><br><br>A lost crown needs prompt attention. Call "+phoneInline+" to book in quickly.<br><br>&#x2022; If you still have the crown, store it safely (small container or bag)<br>&#x2022; Do NOT glue it on with regular household glue<br>&#x2022; Temporary dental cement (pharmacies sell this) can be used to seat it temporarily<br>&#x2022; Avoid chewing on that side<br>&#x2022; The tooth underneath may be sensitive &mdash; avoid hot/cold foods<br><br>Call us and we'll get you seen as quickly as possible."
        ]
    },
    {
        id: 'invisalign_braces',
        priority: 0,
        keywords: ['invisalign','clear aligners','invisible braces','braces','orthodontist','straight teeth','teeth straightening','crooked teeth','overlapping teeth','aligner','retainer','fixed brace','clear brace','spark aligners','enlighten','smile direct'],
        weight: 5,
        responses: [
            "&#x1F9B7; <strong>Teeth Straightening Options</strong><br><br>We can advise on teeth straightening and refer to a specialist orthodontist where needed:<br><br>&#x2022; <strong>NHS orthodontics:</strong> Available for under-18s with a clinical need<br>&#x2022; <strong>Clear aligners (e.g. Invisalign):</strong> Removable, nearly invisible, popular with adults &mdash; private cost<br>&#x2022; <strong>Fixed braces:</strong> Metal or ceramic &mdash; most effective for complex cases<br><br>Adults are generally not eligible for NHS orthodontics unless exceptional clinical need. Call "+phoneInline+" to discuss your options.",
            "&#x1F9B7; <strong>Clear Aligners &mdash; Are They Right for Me?</strong><br><br>Clear aligners like Invisalign are great for mild to moderate crowding, spacing, and bite issues in adults:<br><br>&#x2022; Nearly invisible &mdash; most people won't notice<br>&#x2022; Removable for eating and cleaning<br>&#x2022; Changed every 1&ndash;2 weeks<br>&#x2022; Treatment typically 6&ndash;18 months<br>&#x2022; Private treatment &mdash; requires a consultation and assessment<br><br>Call "+phoneInline+" to discuss whether clear aligners are suitable for you.",
            "&#x1F9B7; <strong>Children &amp; Orthodontics</strong><br><br>Children who need orthodontic treatment may qualify for <strong>NHS braces</strong>:<br><br>&#x2022; Typically assessed at age 12&ndash;14<br>&#x2022; NHS orthodontics covers fixed metal braces for eligible cases<br>&#x2022; An orthodontic assessment is needed &mdash; your dentist can refer<br>&#x2022; Not all cases qualify for NHS treatment (based on clinical need score)<br><br>Bring your child to their regular check-ups and we'll monitor their development and refer when appropriate. Call "+phoneInline+"."
        ]
    },
    {
        id: 'dry_socket',
        priority: 0,
        keywords: ['dry socket','alveolar osteitis','after extraction pain','pain after tooth out','socket pain','pain after removal','healing after extraction','blood clot','extraction healing'],
        weight: 6,
        responses: [
            "&#x26A0;&#xFE0F; <strong>Dry Socket After Extraction</strong><br><br>Dry socket (alveolar osteitis) is one of the most common complications after a tooth extraction. It occurs when the blood clot is lost from the socket.<br><br><strong>Symptoms:</strong><br>&#x2022; Severe, throbbing pain 2&ndash;4 days after extraction<br>&#x2022; Pain radiating to the ear or jaw<br>&#x2022; Empty-looking or greyish socket<br>&#x2022; Bad taste or smell<br><br><strong>Call us immediately on "+phoneInline+" if you think you have dry socket.</strong> We can pack the socket with a soothing dressing for rapid relief.",
            "&#x26A0;&#xFE0F; <strong>Preventing Dry Socket</strong><br><br>After any extraction, follow these instructions carefully to protect the blood clot:<br><br>&#x2022; <strong>No smoking</strong> for at least 5 days (biggest risk factor)<br>&#x2022; Avoid sucking through a straw<br>&#x2022; Eat soft foods on the opposite side<br>&#x2022; Do not rinse vigorously for the first 24 hours<br>&#x2022; After 24 hours, rinse gently with warm salt water<br>&#x2022; Avoid alcohol and hard physical activity<br><br>If you develop severe pain 2&ndash;4 days post-extraction, call "+phoneInline+" urgently.",
            "&#x26A0;&#xFE0F; <strong>Post-Extraction Aftercare</strong><br><br>After having a tooth out:<br><br>&#x2022; Bite firmly on the gauze we provide for 30&ndash;45 minutes<br>&#x2022; Avoid rinsing for 24 hours<br>&#x2022; Soft diet for 24&ndash;48 hours<br>&#x2022; Take pain relief regularly (ibuprofen works well)<br>&#x2022; No smoking, alcohol, or strenuous exercise for 24&ndash;48 hours<br>&#x2022; Rinse gently with warm salt water from day 2<br><br>Most sockets heal within 7&ndash;14 days. If you have severe pain or any concerns, call "+phoneInline+"."
        ]
    },
    {
        id: 'bad_breath_causes',
        priority: 0,
        keywords: ['bad breath','halitosis','breath smells','smelly breath','morning breath','breath after eating','garlic breath','tonsil stones','gum smells','taste in mouth','bad taste'],
        weight: 4,
        responses: [
            "&#x1F4A8; <strong>Bad Breath (Halitosis)</strong><br><br>Bad breath is usually caused by bacteria in the mouth. Most causes are dental:<br><br>&#x2022; <strong>Gum disease</strong> &mdash; most common cause of persistent bad breath<br>&#x2022; <strong>Tooth decay</strong> &mdash; cavities harbour bacteria<br>&#x2022; <strong>Poor oral hygiene</strong> &mdash; tongue cleaning is often overlooked<br>&#x2022; <strong>Dry mouth</strong> &mdash; reduced saliva allows bacteria to multiply<br>&#x2022; <strong>Tonsil stones</strong> &mdash; calcified food debris in tonsil crypts<br>&#x2022; <strong>Diet</strong> &mdash; garlic, onion, strong spices<br><br>Book a hygiene appointment and let us get to the root cause: "+phoneInline,
            "&#x1F4A8; <strong>Treating Bad Breath</strong><br><br>&#x2022; Brush twice daily including the tongue<br>&#x2022; Floss or use interdental brushes daily<br>&#x2022; Stay well hydrated<br>&#x2022; Book a hygiene appointment &mdash; a professional clean removes the bacteria that cause persistent bad breath<br>&#x2022; Check if any teeth have decay<br>&#x2022; Mouthwash alone won't fix the underlying cause<br><br>If bad breath persists despite good hygiene, we'll investigate gum disease or other causes. Call "+phoneInline+".",
            "&#x1F4A8; <strong>Quick Tips for Fresh Breath</strong><br><br>&#x2022; Clean your tongue with a scraper or the back of your brush<br>&#x2022; Stay hydrated &mdash; dry mouth is a major cause<br>&#x2022; Chew sugar-free gum (xylitol) after meals<br>&#x2022; Avoid strong-smelling foods before social occasions<br>&#x2022; Replace your toothbrush every 3 months<br>&#x2022; See us regularly &mdash; gum disease causes persistent bad breath<br><br>Persistent bad breath is usually very treatable. Call "+phoneInline+" to book."
        ]
    },
    {
        id: 'sensitive_teeth',
        priority: 0,
        keywords: ['sensitive','sensitivity','sensitive teeth','cold hurts','hot hurts','sweet hurts','twinge','shooting pain','sensitive to cold','sensitive to hot','dentine','enamel worn','toothpaste sensitive','sensodyne'],
        weight: 5,
        responses: [
            "&#x1F976; <strong>Sensitive Teeth</strong><br><br>Tooth sensitivity has many possible causes:<br><br>&#x2022; <strong>Enamel erosion</strong> &mdash; from acidic foods or drinks<br>&#x2022; <strong>Gum recession</strong> &mdash; exposing the root surface<br>&#x2022; <strong>Grinding</strong> &mdash; wears away enamel<br>&#x2022; <strong>Cracked tooth</strong> &mdash; needs urgent assessment<br>&#x2022; <strong>Early decay</strong> &mdash; a filling will resolve this<br>&#x2022; <strong>Recent dental treatment</strong> &mdash; temporary sensitivity is normal<br><br><strong>Treatment:</strong> Sensitive toothpaste (Sensodyne), fluoride applications, desensitising treatment. Some cases need a filling or other treatment.<br><br>Call "+phoneInline+" to get it checked.",
            "&#x1F976; <strong>Using Sensitive Toothpaste</strong><br><br>Sensitive toothpastes like Sensodyne, Colgate Sensitive, or Arm &amp; Hammer Sensitive work by blocking dentine tubules:<br><br>&#x2022; Use as your daily toothpaste (not just occasionally)<br>&#x2022; Apply a small amount directly to the sensitive tooth and leave it (don't rinse)<br>&#x2022; Results improve over 4&ndash;6 weeks of consistent use<br>&#x2022; They treat symptoms, not the cause<br><br>If sensitivity persists after 4 weeks of sensitive toothpaste, book an appointment: "+phoneInline,
            "&#x1F976; <strong>Sudden Sensitivity &mdash; When to Worry</strong><br><br>&#x2022; Sudden, severe sensitivity to cold that lingers = possible nerve irritation or crack<br>&#x2022; Sensitivity to biting = possible crack or failing filling<br>&#x2022; Sensitivity accompanied by swelling = possible abscess<br>&#x2022; Sensitivity in a tooth with a large old filling = may need a crown<br><br>Don't ignore sudden, worsening sensitivity &mdash; early treatment is always simpler and cheaper. Call "+phoneInline+" today."
        ]
    },
    {
        id: 'new_patient',
        priority: 0,
        keywords: ['new patient','first time','just moved','never been before','just registered','havent been in years','havent seen dentist','not been to dentist','scared first visit','what happens first appointment','what to expect','what do i bring','first appointment','new to area'],
        weight: 6,
        responses: [
            "&#x1F44B; <strong>Welcome! What to Expect at Your First Visit</strong><br><br>Your first appointment will include:<br><br>&#x2022; Completing a medical history form<br>&#x2022; A full examination of your teeth, gums, and soft tissues<br>&#x2022; Oral cancer screening<br>&#x2022; X-rays if clinically needed<br>&#x2022; Discussion of any treatment needed and costs<br>&#x2022; Tailored advice on your home care routine<br><br>Allow about <strong>45&ndash;60 minutes</strong> for a new patient appointment. Bring photo ID and a list of any medications.<br><br>Book: "+phoneInline,
            "&#x1F44B; <strong>What to Bring to Your First Appointment</strong><br><br>&#x2022; <strong>Photo ID</strong> (passport or driving licence)<br>&#x2022; Any <strong>referral letters</strong> from your GP or previous dentist<br>&#x2022; Your <strong>medications list</strong> (or the packaging)<br>&#x2022; Your <strong>NHS exemption proof</strong> if applicable (maternity certificate, benefit letter, etc.)<br>&#x2022; Any <strong>dental records or X-rays</strong> from your previous dentist (optional but helpful)<br><br>Don't worry if you haven't been to the dentist in a while &mdash; we're judgment-free. Call "+phoneInline+".",
            "&#x1F44B; <strong>Haven't Been to the Dentist in a While?</strong><br><br>You're not alone &mdash; many patients come to us after a long gap. We won't judge you, and we won't lecture you.<br><br>&#x2022; We'll start with a thorough assessment to understand where you are<br>&#x2022; We'll prioritise any urgent treatment (pain, infection)<br>&#x2022; Then we'll plan any routine work at a pace that suits you<br>&#x2022; We'll support you with better habits going forward<br><br>The most important thing is that you're here now. Call "+phoneInline+" &mdash; we'll look after you."
        ]
    },

    // ════════════════════════════════════════
    // DEFAULT (must stay last)
    // ════════════════════════════════════════
    {
        id: 'default',
        priority: -1,
        keywords: [],
        weight: 0,
        responses: [
            "I'm not quite sure what you're asking, but I'd love to help! Try asking about:<br>&#x2022; &#x1F4C5; Booking an appointment<br>&#x2022; &#x1F9B7; Our services &amp; treatments<br>&#x2022; &#x1F4B7; NHS pricing<br>&#x2022; &#x1F553; Opening hours<br>&#x2022; &#x1F4CD; Location &amp; directions<br>&#x2022; &#x1F6A8; Dental emergencies<br><br>Or call "+phone+" and our team will be happy to help! &#x1F60A;",
            "Hmm, I didn't quite catch that. I can help with:<br>&#x2022; Appointments &amp; registration<br>&#x2022; NHS &amp; private pricing<br>&#x2022; Treatments (fillings, crowns, dentures and more)<br>&#x2022; Oral health advice<br>&#x2022; Hours, location &amp; transport<br><br>Try rephrasing your question, or call "+phone+".",
            "I want to help &mdash; could you give me a bit more to go on? Try asking something like \"How much is a crown?\" or \"Are you open Saturday?\"<br><br>Or for a direct answer, call "+phoneInline+" during our opening hours (Mon&ndash;Fri 9am&ndash;5pm).",
            "I'm not sure I caught that! Here are some ideas for what you might ask:<br>&#x2022; <strong>Appointments:</strong> \"How do I book?\" or \"Are you taking new patients?\"<br>&#x2022; <strong>Pricing:</strong> \"How much is a root canal?\" or \"What's Band 2?\"<br>&#x2022; <strong>Treatments:</strong> \"Tell me about crowns\" or \"What is gum disease?\"<br>&#x2022; <strong>Emergencies:</strong> \"I have a toothache &mdash; what do I do?\"<br><br>Or call "+phoneInline+" and we'll answer anything directly!",
            "Let me try to help! I can answer questions about:<br>&#x2022; &#x1F4C5; <strong>Appointments &amp; registration</strong><br>&#x2022; &#x1F4B7; <strong>NHS pricing (Bands 1, 2, and 3)</strong><br>&#x2022; &#x1F9B7; <strong>Dental treatments</strong><br>&#x2022; &#x1FAA5; <strong>Oral hygiene and home care</strong><br>&#x2022; &#x1F6A8; <strong>Dental emergencies</strong><br>&#x2022; &#x1F4CD; <strong>Location and directions</strong><br><br>Try one of those topics, or call "+phoneInline+".",
            "Hmm, I'm not quite with you on that one! Let me know how I can help &mdash; whether it's a question about treatment, costs, our team, or how to get to us.<br><br>Alternatively, our friendly reception team is always happy to chat: "+phoneInline+". Mon&ndash;Fri 9am&ndash;5pm.",
            "Not quite sure what you're asking, but I'm here to help with anything dental! Try tapping one of the quick suggestion buttons, or ask me a free-text question like \"Do you do root canals on the NHS?\" or \"I'm nervous about the dentist &mdash; can you help?\"<br><br>Call "+phoneInline+" any time during office hours. &#x1F60A;",
            "I'll give you my best guess, but could you clarify? Try a more specific question like:<br>&#x2022; \"How much is a check-up?\"<br>&#x2022; \"What do I do if I have a dental emergency?\"<br>&#x2022; \"How do I cancel an appointment?\"<br><br>Or speak directly to our team on "+phoneInline+"."
        ]
    }
];

// ── Context-aware follow-up response ─────────
function getContextualResponse(msgWords) {
    const ctx = conversationContext;

    // "how much?" after a topic about a treatment
    const pricingFollowUp = ['how much','cost','price','charge','fee','expensive','affordable','pay'];
    if (pricingFollowUp.some(w => msgWords.includes(w)) && ctx.lastTopic) {
        const pricedTopics = {
            'checkup':        "A check-up is covered by <strong>NHS Band 1: &#163;27.40</strong>. Free if you qualify for NHS exemptions (under 18, pregnant, benefits, HC2).",
            'fillings':       "Fillings are <strong>NHS Band 2: &#163;75.30</strong> &mdash; and one Band 2 charge covers all fillings in the same course of treatment. Private white fillings are quoted individually.",
            'crowns':         "Crowns are <strong>NHS Band 3: &#163;326.70</strong> on the NHS. Private ceramic crowns are quoted at consultation &mdash; call "+phoneInline+" for a quote.",
            'bridges':        "Bridges fall under <strong>NHS Band 3: &#163;326.70</strong>. Private options are available &mdash; call "+phoneInline+" for a private quote.",
            'dentures':       "Dentures are <strong>NHS Band 3: &#163;326.70</strong>. Private dentures (better materials, more natural look) are quoted individually.",
            'root_canal':     "Root canal is covered by <strong>NHS Band 2: &#163;75.30</strong>. Private options available for more complex cases.",
            'extractions':    "Extractions are <strong>NHS Band 2: &#163;75.30</strong>. Free if you have an NHS exemption.",
            'scale_polish':   "Scale &amp; polish is included in <strong>NHS Band 1 (&#163;27.40)</strong> when clinically indicated. If you'd like an extra hygiene visit, ask us about private hygiene appointments.",
            'mouthguards':    "Custom mouthguards are a <strong>private treatment</strong>. Call "+phoneInline+" for current pricing.",
            'night_guards':   "Custom night guards are a <strong>private treatment</strong>. Call "+phoneInline+" for current pricing.",
            'xrays':          "X-rays are included in your <strong>NHS Band 1 check-up (&#163;27.40)</strong> when clinically needed. No extra charge.",
            'nhs_pricing_overview': "NHS charges: <strong>Band 1: &#163;27.40</strong> (check-up), <strong>Band 2: &#163;75.30</strong> (fillings, extractions), <strong>Band 3: &#163;326.70</strong> (crowns, bridges, dentures). Free for exempt patients.",
        };
        const resp = pricedTopics[ctx.lastTopic];
        if (resp) return resp;
    }

    // "where?" follow-up
    const locationWords = ['where','address','how do i get','directions','location'];
    if (locationWords.some(w => msgWords.some(mw => mw.includes(w)))) {
        return "&#x1F4CD; We're at <strong>276a Heathway, Dagenham, Essex, RM10 8QS</strong>.<br><br>&#x1F687; Dagenham Heathway tube (District Line) &mdash; 3 min walk<br>&#x1F68C; Buses 173, 174, 175<br>&#x1F697; Street parking on Heathway<br><br><a href='https://maps.google.com/?q=276a+Heathway+Dagenham+RM10+8QS' target='_blank' style='color:var(--teal)'>Open in Google Maps &#x2197;</a>";
    }

    // "when?" follow-up
    const timeWords = ['when','hours','open','time','what time'];
    if (timeWords.some(w => msgWords.includes(w))) {
        return "&#x1F553; We're open <strong>Mon&ndash;Fri 9am&ndash;1pm and 2pm&ndash;5pm</strong> (closed 1&ndash;2pm for lunch). Closed weekends and bank holidays.";
    }

    return null;
}

// ── Sentiment-aware opening ───────────────────
function sentimentPrefix(sentiment) {
    if (sentiment === 'frustrated') return "I'm really sorry you're having a tough time. Let me help as best I can.<br><br>";
    if (sentiment === 'anxious') return "I completely understand &mdash; you're not alone. Here's what you need to know:<br><br>";
    return '';
}

// ── Multi-part question detector ──────────────
// Returns an array of matched topic IDs if the message seems to contain multiple questions
function detectMultiPart(input, words) {
    const connectors = /\b(and|also|plus|as well as|what about|additionally)\b/i;
    if (!connectors.test(input)) return null;

    const parts = input.split(/\b(?:and|also|plus|as well as|what about|additionally)\b/i);
    if (parts.length < 2) return null;

    const hitIds = [];
    for (const part of parts) {
        const pw = part.toLowerCase().split(/\s+/).filter(Boolean);
        let best = null, bestScore = 0;
        for (const topic of topics) {
            if (topic.id === 'default' || topic.id === 'follow_up' || topic.id === 'clarification') continue;
            const s = scoreKeywords(pw, topic.keywords);
            if (s > bestScore) { bestScore = s; best = topic; }
        }
        if (best && bestScore > 0 && !hitIds.includes(best.id)) hitIds.push(best.id);
    }
    return hitIds.length >= 2 ? hitIds : null;
}

// ── Main smart response function ──────────────
function smartResponse(input) {
    conversationContext.messageCount++;

    const msg = input.toLowerCase().trim();
    const words = msg.split(/\s+/).filter(Boolean);
    const sentiment = detectSentiment(msg);
    conversationContext.sentiment = sentiment;

    // ── 1. Check priority topics first (emergencies etc.) ──
    for (const topic of topics.filter(t => t.priority > 0).sort((a, b) => b.priority - a.priority)) {
        const s = scoreKeywords(words, topic.keywords);
        if (s >= 1) {
            conversationContext.lastTopic = topic.id;
            if (!conversationContext.topicsDiscussed.includes(topic.id)) {
                conversationContext.topicsDiscussed.push(topic.id);
            }
            return sentimentPrefix(sentiment) + pick(topic.responses);
        }
    }

    // ── 2. Very short/unclear messages ──
    if (words.length <= 2 && /^(\?+|huh|eh|what|ok|okay|yes|no|yeah|nah|nope|yep|sure|k|lol|haha)$/.test(msg)) {
        if (msg === 'yes' || msg === 'yeah' || msg === 'yep' || msg === 'sure') {
            // Affirmative — continue with last topic or prompt
            if (conversationContext.lastTopic) {
                return "Great! Feel free to ask anything else about " + conversationContext.lastTopic.replace(/_/g, ' ') + ", or any other dental topic. &#x1F60A;";
            }
            return "What would you like to know? I can help with appointments, services, prices, and more! &#x1F60A;";
        }
        return pick([
            "Could you tell me a bit more? I can help with appointments, pricing, services, location, and dental health tips. &#x1F60A;",
            "No worries! Try asking something like \"How much is a check-up?\" or \"Are you taking new patients?\" &#x1F60A;",
            "Happy to help! What would you like to know about Heathway Dental? &#x1F60A;"
        ]);
    }

    // ── 3. Context-aware follow-up detection ──
    const followUpKeywords = ['how much','more info','tell me more','and the address','where is that','when is that','what about that','more about','anything else','go on'];
    const isFollowUp = followUpKeywords.some(kw => msg.includes(kw));
    if (isFollowUp && conversationContext.lastTopic) {
        const contextResp = getContextualResponse(words);
        if (contextResp) return contextResp;
    }

    // ── 4. Multi-part question detection ──
    const multiHits = detectMultiPart(msg, words);
    if (multiHits && multiHits.length >= 2) {
        const responses = [];
        for (const id of multiHits.slice(0, 2)) {
            const topic = topics.find(t => t.id === id);
            if (topic) responses.push(pick(topic.responses));
        }
        conversationContext.lastTopic = multiHits[multiHits.length - 1];
        multiHits.forEach(id => {
            if (!conversationContext.topicsDiscussed.includes(id)) {
                conversationContext.topicsDiscussed.push(id);
            }
        });
        if (responses.length >= 2) {
            return sentimentPrefix(sentiment) + responses.join("<br><br><hr style='border-color:rgba(255,255,255,0.1);margin:1rem 0'><br>");
        }
    }

    // ── 5. Score all non-priority topics ──
    let bestTopic = null;
    let bestScore = 0;

    for (const topic of topics) {
        if (topic.priority > 0) continue; // already handled
        if (topic.id === 'default') continue;
        const s = scoreKeywords(words, topic.keywords);
        if (s > bestScore) {
            bestScore = s;
            bestTopic = topic;
        }
    }

    // ── 6. Threshold check and fallback ──
    // Score of 0 = no match, use default
    if (!bestTopic || bestScore === 0) {
        // Try one more time with original phrasing (checking for partial topic keyword presence)
        for (const topic of topics) {
            if (topic.id === 'default' || topic.priority > 0) continue;
            if (topic.keywords.some(kw => msg.includes(kw))) {
                bestTopic = topic;
                break;
            }
        }
    }

    const finalTopic = (bestTopic && bestScore > 0) ? bestTopic : topics.find(t => t.id === 'default');

    // Update context
    if (finalTopic && finalTopic.id !== 'default') {
        conversationContext.lastTopic = finalTopic.id;
        if (!conversationContext.topicsDiscussed.includes(finalTopic.id)) {
            conversationContext.topicsDiscussed.push(finalTopic.id);
        }
    }

    return sentimentPrefix(sentiment) + pick(finalTopic.responses);
}

// ── Backwards-compatibility alias ────────────
// If the existing code calls getFallbackResponse(), route it here.
function getFallbackResponse(input) {
    return smartResponse(input);
}
