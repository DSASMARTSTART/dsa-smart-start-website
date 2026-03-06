-- ============================================
-- Fix i18n translations for actual DB course titles
-- ============================================
-- The initial migration matched seed-file titles which differ from live DB.
-- This script matches by UUID (immutable) to guarantee correct updates.

-- =============================================
-- EBOOKS
-- =============================================

-- DSA SMART START A1 – EBOOK
UPDATE courses SET
  title_it       = 'DSA SMART START A1 – E-BOOK',
  title_sr       = 'DSA SMART START A1 – E-KNJIGA',
  title_es       = 'DSA SMART START A1 – E-BOOK',
  description_it = 'E-book digitale completo per principianti assoluti. Impara le basi dell''inglese con la nostra guida PDF completa che copre vocabolario, grammatica e frasi essenziali.',
  description_sr = 'Kompletna digitalna e-knjiga za apsolutne početnike. Naučite osnove engleskog sa našim sveobuhvatnim PDF vodičem koji pokriva vokabular, gramatiku i bitne fraze.',
  description_es = 'E-book digital completo para principiantes absolutos. Aprende los fundamentos del inglés con nuestra guía PDF integral que cubre vocabulario, gramática y frases esenciales.'
WHERE id = 'cd7a1b98-82d6-4e88-8572-a00f6e023f76';

-- DSA SMART START A2 – EBOOK
UPDATE courses SET
  title_it       = 'DSA SMART START A2 – E-BOOK',
  title_sr       = 'DSA SMART START A2 – E-KNJIGA',
  title_es       = 'DSA SMART START A2 – E-BOOK',
  description_it = 'Costruisci sulle tue basi con il nostro e-book A2. Amplia il vocabolario, migliora la grammatica e acquisisci sicurezza nelle conversazioni quotidiane.',
  description_sr = 'Nadogradite osnove sa našom A2 e-knjigom. Proširite vokabular, poboljšajte gramatiku i steknite sigurnost u svakodnevnim razgovorima.',
  description_es = 'Amplía tus bases con nuestro e-book A2. Expande tu vocabulario, mejora la gramática y gana confianza en las conversaciones cotidianas.'
WHERE id = 'aa99ee81-11fd-4562-b1c4-9ec6aeb4b79c';

-- DSA SMART START B1 – EBOOK
UPDATE courses SET
  title_it       = 'DSA SMART START B1 – E-BOOK',
  title_sr       = 'DSA SMART START B1 – E-KNJIGA',
  title_es       = 'DSA SMART START B1 – E-BOOK',
  description_it = 'Porta il tuo inglese al livello successivo. Il nostro e-book B1 copre strutture grammaticali complesse, vocabolario avanzato e competenze di comunicazione professionale.',
  description_sr = 'Podignite svoj engleski na viši nivo. Naša B1 e-knjiga pokriva složene gramatičke strukture, napredni vokabular i veštine profesionalne komunikacije.',
  description_es = 'Lleva tu inglés al siguiente nivel. Nuestro e-book B1 cubre estructuras gramaticales complejas, vocabulario avanzado y habilidades de comunicación profesional.'
WHERE id = 'c63e4783-c4ad-4f44-bad5-8e2916a6ff61';

-- B2 Upper-Intermediate E-book (already matched by previous migration, but re-apply for safety)
UPDATE courses SET
  title_it       = 'E-book B2 Intermedio Superiore',
  title_sr       = 'B2 Viši Srednji E-knjiga',
  title_es       = 'E-book B2 Intermedio Superior',
  description_it = 'Padroneggia l''inglese avanzato con il nostro e-book B2 completo. Perfetto per chi punta alla fluenza in contesti professionali e accademici.',
  description_sr = 'Savladajte napredni engleski sa našom sveobuhvatnom B2 e-knjigom. Savršeno za one koji teže tečnosti u profesionalnim i akademskim kontekstima.',
  description_es = 'Domina el inglés avanzado con nuestro e-book B2 integral. Perfecto para quienes buscan fluidez en contextos profesionales y académicos.'
WHERE id = '35e1615b-26b4-432a-bc7c-6aa665f64281';

-- DSA SMART START ADVANCED – FLYERS EBOOK
UPDATE courses SET
  title_it       = 'DSA SMART START AVANZATO – FLYERS E-BOOK',
  title_sr       = 'DSA SMART START NAPREDNI – FLYERS E-KNJIGA',
  title_es       = 'DSA SMART START AVANZADO – FLYERS E-BOOK',
  description_it = 'Per giovani studenti sicuri e pronti a eccellere! Grammatica avanzata, vocabolario ampliato e esercizi di scrittura creativa in un formato adatto ai bambini.',
  description_sr = 'Za samouverene mlade učenike spremne da se istaknu! Napredna gramatika, prošireni vokabular i vežbe kreativnog pisanja u formatu prilagođenom deci.',
  description_es = 'Para jóvenes estudiantes seguros y listos para sobresalir. Gramática avanzada, vocabulario ampliado y ejercicios de escritura creativa en un formato adaptado a los niños.'
WHERE id = 'a20c1c4f-2337-4a7c-8233-57941a35bb0e';

-- DSA SMART START BASIC – STARTERS EBOOK
UPDATE courses SET
  title_it       = 'DSA SMART START BASE – STARTERS E-BOOK',
  title_sr       = 'DSA SMART START OSNOVNI – STARTERS E-KNJIGA',
  title_es       = 'DSA SMART START BÁSICO – STARTERS E-BOOK',
  description_it = 'Un e-book divertente e colorato pensato per i piccoli studenti! Introduce l''inglese di base attraverso storie coinvolgenti, immagini e semplici esercizi.',
  description_sr = 'Zabavna i šarena e-knjiga dizajnirana za male učenike! Uvodi osnove engleskog kroz privlačne priče, slike i jednostavne vežbe.',
  description_es = 'Un e-book divertido y colorido diseñado para los pequeños estudiantes. Introduce el inglés básico a través de historias atractivas, imágenes y ejercicios sencillos.'
WHERE id = 'daff082a-68c9-4bb7-b8e6-9c8c9e827c77';

-- DSA SMART START KIDS – MOVERS EBOOK (already had translations, re-apply for completeness)
UPDATE courses SET
  title_it       = 'DSA SMART START KIDS – MOVERS E-BOOK',
  title_sr       = 'DSA SMART START KIDS – MOVERS E-KNJIGA',
  title_es       = 'DSA SMART START KIDS – MOVERS E-BOOK',
  description_it = 'L''e-book DSA Smart Start Kids Medium si basa sulle competenze di base, progettato per giovani studenti dai 7 ai 10 anni pronti ad ampliare le proprie competenze in inglese. Attraverso l''apprendimento basato sulle storie, attività creative ed esercizi interattivi, i bambini sviluppano sicurezza nella lettura, scrittura e conversazione. Ogni pagina incorpora metodi adatti alla dislessia per supportare tutti gli stili di apprendimento.',
  description_sr = 'DSA Smart Start Kids Medium e-knjiga nadograđuje osnove, dizajnirana za mlade učenike uzrasta 7-10 godina koji su spremni da prošire svoje veštine engleskog. Kroz učenje zasnovano na pričama, kreativne aktivnosti i interaktivne vežbe, deca razvijaju samopouzdanje u čitanju, pisanju i govoru. Svaka stranica uključuje metode prilagođene disleksiji za podršku svim stilovima učenja.',
  description_es = 'El e-book DSA Smart Start Kids Medium se basa en lo básico, diseñado para jóvenes estudiantes de 7 a 10 años listos para ampliar sus habilidades en inglés. A través del aprendizaje basado en historias, actividades creativas y ejercicios interactivos, los niños desarrollan confianza en la lectura, escritura y expresión oral. Cada página incorpora métodos adaptados a la dislexia para apoyar todos los estilos de aprendizaje.'
WHERE id = 'c86e7224-e6f2-4030-9294-67669f07f3cd';

-- =============================================
-- SERVICES (Live Courses)
-- =============================================

-- Hybrid Pack
UPDATE courses SET
  title_it       = 'Pacchetto Ibrido',
  title_sr       = 'Hibridni Paket',
  title_es       = 'Paquete Híbrido',
  description_it = 'Il meglio dei due mondi — combina l''energia dei laboratori in piccoli gruppi con l''attenzione personalizzata delle lezioni individuali. Include 25 sessioni di laboratorio (50 minuti, 3-4 studenti) più 5 lezioni individuali (30 minuti). Tutti i materiali didattici sono inclusi.',
  description_sr = 'Najbolje od oba sveta — kombinuje energiju laboratorija u malim grupama sa personalizovanim fokusom individualnih časova. Uključuje 25 laboratorijskih sesija (50 minuta, 3-4 učenika) plus 5 individualnih časova (30 minuta). Svi nastavni materijali su uključeni.',
  description_es = 'Lo mejor de ambos mundos — combina la energía de los laboratorios en grupos pequeños con el enfoque personalizado de las clases individuales. Incluye 25 sesiones de laboratorio (50 minutos, 3-4 estudiantes) más 5 lecciones individuales (30 minutos). Todos los materiales didácticos están incluidos.'
WHERE id = '263c2749-aa03-4399-85c4-d664cc3e2bc5';

-- Language Lab
UPDATE courses SET
  title_it       = 'Laboratorio Linguistico',
  title_sr       = 'Jezička Laboratorija',
  title_es       = 'Laboratorio de Idiomas',
  description_it = 'Sessioni live in piccoli gruppi progettate per un apprendimento interattivo e mirato. Unisciti a una classe di 3-4 studenti per 8 sessioni dinamiche di laboratorio, ciascuna della durata di 50 minuti. Perfetto per chi apprende meglio in ambienti collaborativi con attenzione personalizzata.',
  description_sr = 'Sesije uživo u malim grupama osmišljene za fokusirano, interaktivno učenje. Pridružite se grupi od 3-4 učenika za 8 dinamičnih laboratorijskih sesija, svaka u trajanju od 50 minuta. Savršeno za učenike koji najbolje napreduju u kolaborativnim okruženjima sa personalizovanom pažnjom.',
  description_es = 'Sesiones en vivo en grupos pequeños diseñadas para un aprendizaje interactivo y enfocado. Únete a una clase de 3-4 estudiantes para 8 sesiones dinámicas de laboratorio, cada una de 50 minutos. Perfecto para quienes aprenden mejor en entornos colaborativos con atención personalizada.'
WHERE id = '6ae25d79-41ed-4f8b-b3b9-d89818a64d9b';

-- Language Lab Pro
UPDATE courses SET
  title_it       = 'Laboratorio Linguistico Pro',
  title_sr       = 'Jezička Laboratorija Pro',
  title_es       = 'Laboratorio de Idiomas Pro',
  description_it = 'Il nostro programma più intensivo in piccoli gruppi con 30 sessioni di laboratorio live. Unisciti a una classe di 3-4 studenti per sessioni di 50 minuti ricche di esercizi interattivi, pratica conversazionale reale e sviluppo progressivo delle competenze. Tutti i materiali didattici sono inclusi.',
  description_sr = 'Naš najintenzivniji program u malim grupama sa 30 laboratorijskih sesija uživo. Pridružite se grupi od 3-4 učenika za sesije od 50 minuta pune interaktivnih vežbi, prakse stvarnog razgovora i progresivnog razvoja veština. Svi nastavni materijali su uključeni.',
  description_es = 'Nuestro programa más intensivo en grupos pequeños con 30 sesiones de laboratorio en vivo. Únete a una clase de 3-4 estudiantes para sesiones de 50 minutos llenas de ejercicios interactivos, práctica de conversación real y desarrollo progresivo de habilidades. Todos los materiales didácticos están incluidos.'
WHERE id = 'adb59b87-d727-4e45-bb06-0e43e0c76546';

-- Starter Path
UPDATE courses SET
  title_it       = 'Percorso Iniziale',
  title_sr       = 'Početni Put',
  title_es       = 'Camino Inicial',
  description_it = 'Inizia il tuo percorso in inglese con un''attenzione personalizzata uno-a-uno. Questo programma iniziale include 5 lezioni individuali di 30 minuti ciascuna, interamente su misura per le tue esigenze e il tuo ritmo di apprendimento. Ideale per principianti o per chiunque cerchi un''introduzione mirata.',
  description_sr = 'Započnite svoj put u engleskom sa personalizovanom pažnjom jedan-na-jedan. Ovaj početni program uključuje 5 individualnih časova po 30 minuta, potpuno prilagođenih vašim potrebama i tempu učenja. Idealan za početnike ili za svakoga ko traži fokusiran uvod.',
  description_es = 'Comienza tu camino en inglés con atención personalizada uno a uno. Este programa inicial incluye 5 lecciones individuales de 30 minutos cada una, totalmente adaptadas a tus necesidades y ritmo de aprendizaje. Ideal para principiantes o cualquiera que busque una introducción enfocada.'
WHERE id = 'b8962e79-f1a9-40bd-8210-587090efd258';

-- =============================================
-- VERIFICATION
-- =============================================
SELECT title, 
       CASE WHEN title_it IS NOT NULL THEN '✅' ELSE '❌' END as it,
       CASE WHEN title_sr IS NOT NULL THEN '✅' ELSE '❌' END as sr,
       CASE WHEN title_es IS NOT NULL THEN '✅' ELSE '❌' END as es
FROM courses
WHERE is_published = true
ORDER BY product_type, level;
