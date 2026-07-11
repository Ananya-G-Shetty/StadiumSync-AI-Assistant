import { db } from '@/db';
import { venues, amenities, matches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Chat API Request Body:', JSON.stringify(body));
    const { messages, venueId } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request: messages must be an array', { status: 400 });
    }

    // 1. Fetch Venue Context from PGLite database
    let venueContext = '';
    let venueName = 'FIFA 2026 Stadium';
    
    if (venueId) {
      const selectedVenue = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      
      if (selectedVenue.length > 0) {
        const v = selectedVenue[0];
        venueName = v.name;
        
        // Fetch all amenities for this venue
        const venueAmenities = await db.select().from(amenities).where(eq(amenities.venueId, venueId));
        
        // Fetch matches for this venue
        const venueMatches = await db.select().from(matches).where(eq(matches.venueId, venueId));

        // Format amenities string
        const amenitiesText = venueAmenities
          .map(
            (a: any) =>
              `- [${a.type.toUpperCase()}] ${a.name} (Location: ${a.location}, Level: ${a.level}, Section: ${a.section}, Status: ${a.status}, Accessible: ${a.isAccessible ? 'Yes' : 'No'}${a.accessibilityDetails ? `, Details: ${a.accessibilityDetails}` : ''})`
          )
          .join('\n');

        // Format matches string
        const matchesText = venueMatches
          .map(
            (m: any) =>
              `- ${m.homeTeam} vs ${m.awayTeam} (Date: ${m.datetime.toISOString()}, Status: ${m.status}${m.score ? `, Score: ${m.score}` : ''})`
          )
          .join('\n');

        venueContext = `
Active Stadium Context:
- Name: ${v.name}
- Location: ${v.city}, ${v.country}
- Capacity: ${v.capacity}
- Accessibility Summary: ${v.accessibilitySummary}
- Priority Gates: ${v.gates}

Stadium Amenities (Live Database Status):
${amenitiesText || 'No amenities registered for this venue.'}

Match Fixtures for this Stadium:
${matchesText || 'No matches registered for this venue.'}
`;
      }
    }

    // 2. Build the System Prompt
    const systemPrompt = `
You are "StadiumSync AI", an intelligent, accessibility-first fan assistance agent for the FIFA World Cup 2026.
Your primary role is to assist fans, especially those with disabilities (wheelchair users, sensory sensitivities, visual/hearing impairments), elderly visitors, and international travelers, in navigating stadiums and tournament schedules.

RULES OF CONDUCT:
1. Be extremely polite, clear, and accessibility-conscious.
2. Provide details about ramps, elevators, sensory rooms, first aid, and accessible restrooms.
3. CRITICAL: Use the "Stadium Amenities" database status. If a user asks for navigation and the closest elevator or escalator is marked "maintenance" or "closed", WARN the user immediately and suggest an alternative operational accessible amenity (e.g. Elevator Bank A instead of Section 228 Escalator).
4. Keep your directions simple, step-by-step, and concise. Avoid walls of text.
5. You support English, Spanish, and French. ALWAYS reply in the language the user speaks to you (Auto-detect language). If they ask in Spanish, reply in Spanish. If they ask in French, reply in French.
6. Provide helpful safety, security, and emergency instructions if asked.
7. Keep responses markdown-formatted. Use lists and bold text for clarity.

${venueContext}
`;

    // Convert client-side UIMessages (with parts) to server-side CoreMessages (with content string)
    const coreMessages = messages.map((m: any) => {
      let content = '';
      if (m.content) {
        content = m.content;
      } else if (Array.isArray(m.parts)) {
        content = m.parts
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('');
      }
      return {
        role: m.role,
        content: content,
      };
    });

    // 3. API Key check and fallback implementation
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured. Falling back to local Mock AI response.');
      return await getMockStreamResponse(coreMessages[coreMessages.length - 1].content, venueId || 'metlife-stadium');
    }

    // 4. Initialize Google Gemini Stream
    // We create the Google client using the API key from environment variables
    const google = createGoogleGenerativeAI({
      apiKey: apiKey,
    });
    const googleClient = google('gemini-1.5-flash');

    const result = await streamText({
      model: googleClient,
      messages: coreMessages,
      system: systemPrompt,
    });

    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Intelligent Offline/Local Mock AI Helper
async function getMockStreamResponse(userQuery: string, venueId: string) {
  const query = userQuery.toLowerCase();
  let response = '';

  // Fetch Venue details
  const selectedVenue = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
  const venue = selectedVenue.length > 0 ? selectedVenue[0] : {
    id: 'metlife-stadium',
    name: 'MetLife Stadium',
    city: 'East Rutherford, NJ',
    country: 'USA',
    capacity: 82500,
    accessibilitySummary: 'Fully ADA compliant. Offering comprehensive wheelchair-accessible seating across all levels, assisted listening devices, captioning boards, and multiple sensory relief rooms.',
    gates: 'Gate A (ADA Priority), Gate B, Gate C, Gate D, Pepsi Gate, Verizon Gate',
  };
  const venueName = venue.name;

  // Fetch amenities and matches from DB
  const venueAmenities = await db.select().from(amenities).where(eq(amenities.venueId, venue.id));
  const venueMatches = await db.select().from(matches).where(eq(matches.venueId, venue.id));

  const isSpanish = /hola|donde|baño|estadio|elevador|ayuda|juego|silla|ruedas|rampa|comida|asiento|médico|auxilio|partido|calendario/i.test(query);
  const isFrench = /bonjour|ou|toilette|stade|ascenseur|aide|match|fauteuil|rampe|nourriture|siège|médical|secours|calendrier/i.test(query);

  const getStatusEmoji = (status: string) => {
    if (status === 'operational') return '✅ Operational';
    if (status === 'maintenance') return '⚠️ Maintenance';
    return '❌ Closed';
  };

  const getStatusEmojiEs = (status: string) => {
    if (status === 'operational') return '✅ Operativo';
    if (status === 'maintenance') return '⚠️ En Mantenimiento';
    return '❌ Cerrado';
  };

  const getStatusEmojiFr = (status: string) => {
    if (status === 'operational') return '✅ Opérationnel';
    if (status === 'maintenance') return '⚠️ En Maintenance';
    return '❌ Fermé';
  };

  // 1. Restrooms Check
  const isRestroomQuery = /restroom|bathroom|toilet|washroom|baño|sanitario|toilette|wc/i.test(query);
  // 2. Accessibility/Mobility/Elevator Check (including wheelchair & seating)
  const isMobilityQuery = /elevator|escalator|lift|ramp|stairs|step-free|wheelchair|seating|accessible|silla|ruedas|elevador|ascensor|rampa|gradas|fauteuil|accès|escalier|asiento/i.test(query);
  // 3. Sensory Check
  const isSensoryQuery = /sensory|quiet|autism|adhd|noise|calm|sensorial|silencio|ruido|autismo|decompression|calme/i.test(query);
  // 4. Food Check
  const isFoodQuery = /food|drink|eat|concession|counter|gluten|vegan|allergen|dietary|comida|bebida|concesion|alergia|nourriture|boisson|sans gluten/i.test(query);
  // 5. Medical Check
  const isMedicalQuery = /medical|first aid|emergency|assistance|doctor|ambulance|auxilios|médico|emergencia|secours|médicale/i.test(query);
  // 6. Service Animal Check
  const isAnimalQuery = /animal|dog|relief|pet|perro|mascota|guiar|chien|assistance/i.test(query);
  // 7. Match Check
  const isMatchQuery = /match|schedule|game|score|play|fixture|partido|calendario|juego|rencontre/i.test(query);

  if (isSpanish) {
    if (isRestroomQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'restroom');
      if (list.length > 0) {
        response = `### 🚻 Sanitarios Accesibles en **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Ubicación**: ${a.location} (Sección ${a.section}, Nivel ${a.level})\n  * **Estado**: ${getStatusEmojiEs(a.status)}\n  * **Detalles**: ${a.accessibilityDetails || 'Sin detalles adicionales.'}\n\n`;
        });
      } else {
        response = `### 🚻 Sanitarios Accesibles en **${venueName}**\nNo se encontraron sanitarios registrados en este estadio en este momento.`;
      }
    } else if (isMobilityQuery) {
      const uniqueItems = venueAmenities.filter((a: any) => 
        a.type === 'elevator' || 
        a.type === 'ramp' || 
        a.name.toLowerCase().includes('wheelchair') || 
        a.name.toLowerCase().includes('accessible') || 
        a.name.toLowerCase().includes('silla') || 
        a.name.toLowerCase().includes('asiento') ||
        (a.accessibilityDetails && (
          a.accessibilityDetails.toLowerCase().includes('wheelchair') || 
          a.accessibilityDetails.toLowerCase().includes('accessible') || 
          a.accessibilityDetails.toLowerCase().includes('silla')
        ))
      );

      response = `### ♿ Accesibilidad y Movilidad en **${venueName}**\n`;
      const maintenanceItems = uniqueItems.filter((u: any) => u.status !== 'operational');
      if (maintenanceItems.length > 0) {
        response += `⚠️ **ALERTA DE MANTENIMIENTO / ACCESIBILIDAD**: Las siguientes instalaciones no están operativas actualmente. Por favor, planifica tu ruta para evitarlas:\n`;
        maintenanceItems.forEach((item: any) => {
          response += `- **${item.name}** en ${item.location} está en **${item.status === 'maintenance' ? 'mantenimiento' : 'cerrado'}**. Sugerimos usar rutas alternativas.\n`;
        });
        response += `\n`;
      }

      response += `**Instalaciones de acceso sin escalones y asientos accesibles disponibles:**\n\n`;
      const operationalItems = uniqueItems.filter((u: any) => u.status === 'operational');
      if (operationalItems.length > 0) {
        operationalItems.forEach((a: any) => {
          response += `* **${a.name}** (${a.type === 'elevator' ? '🛗 Elevador' : a.type === 'ramp' ? '♿ Rampa' : 'Asiento / Entrada'})\n  * **Ubicación**: ${a.location} (Nivel ${a.level}, Sección ${a.section})\n  * **Detalles**: ${a.accessibilityDetails || 'Ruta de accesibilidad activa.'}\n\n`;
        });
      } else {
        response += `No se encontraron rampas, elevadores o asientos accesibles operativos registrados en este momento.`;
      }
    } else if (isSensoryQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'sensory_room');
      if (list.length > 0) {
        response = `### 🧩 Salas de Relajación Sensorial en **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Ubicación**: ${a.location} (Sección ${a.section}, Nivel ${a.level})\n  * **Estado**: ${getStatusEmojiEs(a.status)}\n  * **Detalles**: ${a.accessibilityDetails || 'Equipado con herramientas de relajación sensorial.'}\n\n`;
        });
      } else {
        response = `### 🧩 Salas de Relajación Sensorial en **${venueName}**\nActualmente no hay salas sensoriales específicas registradas para este estadio.`;
      }
    } else if (isFoodQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'food');
      if (list.length > 0) {
        response = `### 🍔 Alimentos y Concesiones en **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Ubicación**: ${a.location} (Sección ${a.section}, Nivel ${a.level})\n  * **Estado**: ${getStatusEmojiEs(a.status)}\n  * **Opciones y Accesibilidad**: ${a.accessibilityDetails || 'Barra de atención estándar.'}\n\n`;
        });
      } else {
        response = `### 🍔 Alimentos y Concesiones en **${venueName}**\nNo se encontraron concesiones de alimentos registradas para este estadio.`;
      }
    } else if (isMedicalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'first_aid');
      if (list.length > 0) {
        response = `### 🚑 Estaciones de Primeros Auxilios en **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Ubicación**: ${a.location} (Sección ${a.section}, Nivel ${a.level})\n  * **Estado**: ${getStatusEmojiEs(a.status)}\n  * **Servicios**: ${a.accessibilityDetails || 'Atención médica básica.'}\n\n`;
        });
      } else {
        response = `### 🚑 Estaciones de Primeros Auxilios en **${venueName}**\nNo se encontraron estaciones médicas registradas para este estadio.`;
      }
    } else if (isAnimalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'relief_area');
      if (list.length > 0) {
        response = `### 🐕 Áreas de Alivio para Animales de Servicio en **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Ubicación**: ${a.location}\n  * **Estado**: ${getStatusEmojiEs(a.status)}\n  * **Equipamiento**: ${a.accessibilityDetails || 'Dispensador de bolsas y agua.'}\n\n`;
        });
      } else {
        response = `### 🐕 Áreas de Alivio en **${venueName}**\nNo hay áreas designadas de alivio para animales de servicio en el registro.`;
      }
    } else if (isMatchQuery) {
      if (venueMatches.length > 0) {
        response = `### 📅 Calendario de Partidos en **${venueName}**\n\n`;
        response += `| Fecha y Hora | Partido | Estado | Marcador |\n| --- | --- | --- | --- |\n`;
        venueMatches.forEach((m: any) => {
          const dateStr = new Date(m.datetime).toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const statusStr = m.status === 'live' ? '🔴 EN VIVO' : m.status === 'completed' ? 'Finalizado' : 'Programado';
          response += `| ${dateStr} | **${m.homeTeam} vs ${m.awayTeam}** | ${statusStr} | ${m.score || '-'} |\n`;
        });
      } else {
        response = `### 📅 Calendario de Partidos en **${venueName}**\nNo hay partidos programados registrados para este estadio.`;
      }
    } else {
      response = `¡Hola! Soy **StadiumSync AI**, tu asistente virtual para **${venueName}** durante el Mundial FIFA 2026.\n\n`;
      response += `**Resumen de Accesibilidad del Estadio:**\n${venue.accessibilitySummary || 'Instalaciones accesibles de primera categoría.'}\n\n`;
      response += `**Puertas de Acceso de Prioridad ADA:**\n${venue.gates || 'Cualquier puerta principal tiene personal ADA disponible.'}\n\n`;
      response += `Puedo responder tus dudas en español. Pregúntame sobre:\n`;
      response += `* ♿ **Accesibilidad**: Rampas, elevadores y rutas sin escalones.\n`;
      response += `* 🚻 **Sanitarios**: Sanitarios adaptados y familiares.\n`;
      response += `* 🧩 **Apoyo Sensorial**: Salas sensoriales y kits reductores de ruido.\n`;
      response += `* 🍔 **Comida**: Concesiones con barras bajas y opciones dietéticas (sin gluten, vegano).\n`;
      response += `* 🚑 **Emergencia**: Estaciones de primeros auxilios y asistencia médica.\n\n`;
      response += `*¿En qué puedo ayudarte hoy? (Nota: Ejecutando en modo de demostración local)*`;
    }
  } else if (isFrench) {
    if (isRestroomQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'restroom');
      if (list.length > 0) {
        response = `### 🚻 Toilettes Accessibles à **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Emplacement**: ${a.location} (Section ${a.section}, Niveau ${a.level})\n  * **Statut**: ${getStatusEmojiFr(a.status)}\n  * **Détails**: ${a.accessibilityDetails || 'Aucun détail supplémentaire.'}\n\n`;
        });
      } else {
        response = `### 🚻 Toilettes Accessibles à **${venueName}**\nAucune toilette accessible enregistrée pour ce stade pour le moment.`;
      }
    } else if (isMobilityQuery) {
      const uniqueItems = venueAmenities.filter((a: any) => 
        a.type === 'elevator' || 
        a.type === 'ramp' || 
        a.name.toLowerCase().includes('wheelchair') || 
        a.name.toLowerCase().includes('accessible') || 
        a.name.toLowerCase().includes('fauteuil') || 
        a.name.toLowerCase().includes('siège') ||
        (a.accessibilityDetails && (
          a.accessibilityDetails.toLowerCase().includes('wheelchair') || 
          a.accessibilityDetails.toLowerCase().includes('accessible') || 
          a.accessibilityDetails.toLowerCase().includes('fauteuil')
        ))
      );

      response = `### ♿ Accessibilité et Mobilité à **${venueName}**\n`;
      const maintenanceItems = uniqueItems.filter((u: any) => u.status !== 'operational');
      if (maintenanceItems.length > 0) {
        response += `⚠️ **ALERTE DE MAINTENANCE / ACCESSIBILITÉ**: Les installations suivantes sont actuellement indisponibles. Veuillez planifier votre itinéraire pour les éviter:\n`;
        maintenanceItems.forEach((item: any) => {
          response += `- **${item.name}** à ${item.location} est en **${item.status === 'maintenance' ? 'maintenance' : 'fermé'}**. Nous vous suggérons d'utiliser un autre itinéraire.\n`;
        });
        response += `\n`;
      }

      response += `**Installations d'accès sans marches et sièges accessibles disponibles:**\n\n`;
      const operationalItems = uniqueItems.filter((u: any) => u.status === 'operational');
      if (operationalItems.length > 0) {
        operationalItems.forEach((a: any) => {
          response += `* **${a.name}** (${a.type === 'elevator' ? '🛗 Ascenseur' : a.type === 'ramp' ? '♿ Rampe' : 'Siège / Accès'})\n  * **Emplacement**: ${a.location} (Niveau ${a.level}, Section ${a.section})\n  * **Détails**: ${a.accessibilityDetails || 'Itinéraire accessible actif.'}\n\n`;
        });
      } else {
        response += `Aucun ascenseur ou rampe opérationnel trouvé.`;
      }
    } else if (isSensoryQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'sensory_room');
      if (list.length > 0) {
        response = `### 🧩 Salles de Décompression Sensorielle à **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Emplacement**: ${a.location} (Section ${a.section}, Niveau ${a.level})\n  * **Statut**: ${getStatusEmojiFr(a.status)}\n  * **Détails**: ${a.accessibilityDetails || 'Équipé pour la décompression sensorielle.'}\n\n`;
        });
      } else {
        response = `### 🧩 Salles Sensorielles à **${venueName}**\nAucune salle sensorielle spécifique n'est enregistrée pour ce stade.`;
      }
    } else if (isFoodQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'food');
      if (list.length > 0) {
        response = `### 🍔 Restauration et Concessions à **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Emplacement**: ${a.location} (Section ${a.section}, Niveau ${a.level})\n  * **Statut**: ${getStatusEmojiFr(a.status)}\n  * **Options et Accessibilité**: ${a.accessibilityDetails || 'Comptoir standard.'}\n\n`;
        });
      } else {
        response = `### 🍔 Concessions à **${venueName}**\nAucune concession alimentaire enregistrée.`;
      }
    } else if (isMedicalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'first_aid');
      if (list.length > 0) {
        response = `### 🚑 Postes de Premiers Secours à **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Emplacement**: ${a.location} (Section ${a.section}, Niveau ${a.level})\n  * **Statut**: ${getStatusEmojiFr(a.status)}\n  * **Services**: ${a.accessibilityDetails || 'Premiers secours de base.'}\n\n`;
        });
      } else {
        response = `### 🚑 Premiers Secours à **${venueName}**\nAucun poste de premiers secours enregistré.`;
      }
    } else if (isAnimalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'relief_area');
      if (list.length > 0) {
        response = `### 🐕 Zones de Soulagement pour Chiens d'Assistance à **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Emplacement**: ${a.location}\n  * **Statut**: ${getStatusEmojiFr(a.status)}\n  * **Équipements**: ${a.accessibilityDetails || 'Distribution de sacs et eau.'}\n\n`;
        });
      } else {
        response = `### 🐕 Zones de Soulagement à **${venueName}**\nAucune zone de soulagement pour chiens d'assistance n'est enregistrée.`;
      }
    } else if (isMatchQuery) {
      if (venueMatches.length > 0) {
        response = `### 📅 Calendrier des Matchs à **${venueName}**\n\n`;
        response += `| Date & Heure | Match | Statut | Score |\n| --- | --- | --- | --- |\n`;
        venueMatches.forEach((m: any) => {
          const dateStr = new Date(m.datetime).toLocaleString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const statusStr = m.status === 'live' ? '🔴 EN DIRECT' : m.status === 'completed' ? 'Terminé' : 'Programmé';
          response += `| ${dateStr} | **${m.homeTeam} vs ${m.awayTeam}** | ${statusStr} | ${m.score || '-'} |\n`;
        });
      } else {
        response = `### 📅 Matchs à **${venueName}**\nAucun match programmé trouvé pour ce stade.`;
      }
    } else {
      response = `Bonjour! Je suis **StadiumSync AI**, votre assistant virtuel pour **${venueName}** pendant la Coupe du Monde FIFA 2026.\n\n`;
      response += `**Résumé de l'Accessibilité du Stade:**\n${venue.accessibilitySummary || 'Installations accessibles de premier ordre.'}\n\n`;
      response += `**Entrées Prioritaires ADA:**\n${venue.gates || 'Toutes les entrées principales disposent d\'un personnel ADA.'}\n\n`;
      response += `Je peux répondre à vos questions en français. Demandez-moi:\n`;
      response += `* ♿ **Accessibilité**: Ascenseurs, rampes, itinéraires sans marches.\n`;
      response += `* 🚻 **Toilettes**: Toilettes adaptées et familiales.\n`;
      response += `* 🧩 **Décompression**: Salles sensorielles et kits de réduction du bruit.\n`;
      response += `* 🍔 **Restauration**: Options alimentaires (sans gluten, végétalien) et comptoirs abaissés.\n`;
      response += `* 🚑 **Urgence**: Postes de secours et assistance médicale.\n\n`;
      response += `*Comment puis-je vous aider aujourd'hui ? (Mode démo local activé)*`;
    }
  } else {
    // English defaults
    if (isRestroomQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'restroom');
      if (list.length > 0) {
        response = `### 🚻 Accessible Restrooms at **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Location**: ${a.location} (Section ${a.section}, Level ${a.level})\n  * **Status**: ${getStatusEmoji(a.status)}\n  * **Accessibility Details**: ${a.accessibilityDetails || 'No additional details provided.'}\n\n`;
        });
      } else {
        response = `### 🚻 Accessible Restrooms at **${venueName}**\nNo accessible restrooms found registered for this stadium.`;
      }
    } else if (isMobilityQuery) {
      const uniqueItems = venueAmenities.filter((a: any) => 
        a.type === 'elevator' || 
        a.type === 'ramp' || 
        a.name.toLowerCase().includes('wheelchair') || 
        a.name.toLowerCase().includes('accessible') || 
        a.name.toLowerCase().includes('seating') ||
        (a.accessibilityDetails && (
          a.accessibilityDetails.toLowerCase().includes('wheelchair') || 
          a.accessibilityDetails.toLowerCase().includes('accessible') || 
          a.accessibilityDetails.toLowerCase().includes('seating')
        ))
      );

      response = `### ♿ Mobility & Step-Free Access at **${venueName}**\n`;
      const maintenanceItems = uniqueItems.filter((u: any) => u.status !== 'operational');
      if (maintenanceItems.length > 0) {
        response += `⚠️ **MAINTENANCE & ACCESSIBILITY ALERT**: The following mobility facilities are currently offline. Please adjust your route to avoid them:\n`;
        maintenanceItems.forEach((item: any) => {
          response += `- **${item.name}** in ${item.location} is currently in **${item.status}** status. We strongly recommend routing around this section.\n`;
        });
        response += `\n`;
      }

      response += `**Available Step-Free Elevators, Ramps, & Accessible Entrances:**\n\n`;
      const operationalItems = uniqueItems.filter((u: any) => u.status === 'operational');
      if (operationalItems.length > 0) {
        operationalItems.forEach((a: any) => {
          response += `* **${a.name}** (${a.type === 'elevator' ? '🛗 Elevator' : a.type === 'ramp' ? '♿ Ramp' : 'Seat / Entry'})\n  * **Location**: ${a.location} (Level ${a.level}, Section ${a.section})\n  * **Details**: ${a.accessibilityDetails || 'Step-free route is open.'}\n\n`;
        });
      } else {
        response += `No operational elevators, ramps, or wheelchair seating records found in the database.`;
      }
    } else if (isSensoryQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'sensory_room');
      if (list.length > 0) {
        response = `### 🧩 Sensory Relief & Quiet Rooms at **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Location**: ${a.location} (Section ${a.section}, Level ${a.level})\n  * **Status**: ${getStatusEmoji(a.status)}\n  * **Details**: ${a.accessibilityDetails || 'Equipped with autism-friendly and ADHD sensory decompression kits.'}\n\n`;
        });
      } else {
        response = `### 🧩 Sensory Relief & Quiet Rooms at **${venueName}**\nNo sensory rooms registered for this venue.`;
      }
    } else if (isFoodQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'food');
      if (list.length > 0) {
        response = `### 🍔 Food & Concession Stands at **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Location**: ${a.location} (Section ${a.section}, Level ${a.level})\n  * **Status**: ${getStatusEmoji(a.status)}\n  * **Dietary & ADA Features**: ${a.accessibilityDetails || 'Standard concession stall.'}\n\n`;
        });
      } else {
        response = `### 🍔 Food & Concessions at **${venueName}**\nNo registered concessions found.`;
      }
    } else if (isMedicalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'first_aid');
      if (list.length > 0) {
        response = `### 🚑 First Aid & Medical Stations at **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Location**: ${a.location} (Section ${a.section}, Level ${a.level})\n  * **Status**: ${getStatusEmoji(a.status)}\n  * **Services**: ${a.accessibilityDetails || 'Basic medical/first aid triage base.'}\n\n`;
        });
      } else {
        response = `### 🚑 First Aid & Medical at **${venueName}**\nNo first aid stations registered.`;
      }
    } else if (isAnimalQuery) {
      const list = venueAmenities.filter((a: any) => a.type === 'relief_area');
      if (list.length > 0) {
        response = `### 🐕 Service Animal Relief Areas at **${venueName}**\n\n`;
        list.forEach((a: any) => {
          response += `* **${a.name}**\n  * **Location**: ${a.location}\n  * **Status**: ${getStatusEmoji(a.status)}\n  * **Features**: ${a.accessibilityDetails || 'Fenced area with waste bags and watering station.'}\n\n`;
        });
      } else {
        response = `### 🐕 Service Animal Relief Areas at **${venueName}**\nNo service animal relief areas registered.`;
      }
    } else if (isMatchQuery) {
      if (venueMatches.length > 0) {
        response = `### 📅 Match Schedule & Fixtures at **${venueName}**\n\n`;
        response += `| Date & Time | Match | Status | Score |\n| --- | --- | --- | --- |\n`;
        venueMatches.forEach((m: any) => {
          const dateStr = new Date(m.datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const statusStr = m.status === 'live' ? '🔴 LIVE' : m.status === 'completed' ? 'Completed' : 'Scheduled';
          response += `| ${dateStr} | **${m.homeTeam} vs ${m.awayTeam}** | ${statusStr} | ${m.score || '-'} |\n`;
        });
      } else {
        response = `### 📅 Match Fixtures at **${venueName}**\nNo matches scheduled for this venue.`;
      }
    } else {
      response = `Hello! I am **StadiumSync AI**, your virtual assistant for **${venueName}** during the FIFA World Cup 2026.

**Stadium Accessibility Summary:**
${venue.accessibilitySummary || 'State-of-the-art step-free and accessible design.'}

**Priority Accessibility Entry Gates:**
${venue.gates || 'ADA Priority access staffing is present at all major entry zones.'}

I am here to ensure a barrier-free experience. Ask me anything about:
* ♿ **Wheelchair Access**: Ramps, elevators, and companion seating locations.
* 🚻 **Restrooms**: Accessible, all-gender, and companion changing toilets.
* 🍔 **Amenities & Concessions**: Food stalls with low-counters and dietary options (gluten-free, vegan).
* 🧩 **Sensory Support**: Sensory rooms, quiet zones, and sensory kit pickups.
* 🚑 **Medical**: First Aid locations and direct alerts.
* 📅 **Fixtures**: Match schedules and live stadium queue wait times.

*How can I assist you today? (Note: Running in offline mock-AI fallback mode)*`;
    }
  }

  // Create stream encoding matching Vercel AI SDK 5.0 UIMessageChunk format (SSE eventsource-parser format)
  const encoder = new TextEncoder();
  const assistantMessageId = `msg-ai-${Math.random().toString(36).substring(2, 11)}`;

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send text-start chunk
      const startChunk = { type: 'text-start', id: assistantMessageId };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(startChunk)}\n\n`));

      // 2. Chunk response by words to simulate streaming
      const words = response.split(/(\s+)/);
      for (const word of words) {
        const chunk = { type: 'text-delta', id: assistantMessageId, delta: word };
        const formattedChunk = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(encoder.encode(formattedChunk));
        await new Promise((r) => setTimeout(r, 8));
      }

      // 3. Send text-end chunk
      const endChunk = { type: 'text-end', id: assistantMessageId };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(endChunk)}\n\n`));

      // 4. Terminate stream
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'x-vercel-ai-ui-message-stream': 'v1',
    },
  });
}

