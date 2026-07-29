"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const slides = [
  {
    kind: "title",
    unit: "CHC2D Documentary",
    title: "A Century of Canadian History Through Photographs",
    date: "1914-2010",
    image: "/history/assets/image7.png",
    alt: "Black and white photograph of the Canadian Parliament buildings.",
    source: "Opening image: Canadian Parliament",
    tag: "Canada",
    copy: [
      "Name: Kevin Jing",
      "CHC2D"
    ],
    lens: "Style direction: documentary archive. Large photographs, cinematic contrast, typewriter captions, and a sober timeline treatment."
  },
  {
    unit: "Unit 1 · Continuity and Change",
    title: "Women Working in Factories",
    date: "1916-1917",
    image: "/history/assets/image5.png",
    alt: "Women working in a munitions factory during the First World War.",
    source: "Parks Canada · c. 1916-1917",
    tag: "WWI",
    copy: [
      "Timeline: 1914 Canada enters WW1. 1919 Canadian soldier returns from WW1.",
      "This photograph shows a woman working in a munition factory during WW1, around 1916 and 1917. Before World War 1, most women worked at home or in traditional jobs such as teaching or nursing. As many men started to fight in the war, women took jobs in factories to produce shells and other military supplies.",
      "This represents Continuity and Change because women continued contributing to Canadian society, but their role changed significantly. Before the war, most women worked at home or in tradition jobs. During the war, many women began working in factories that were previously employed by men."
    ],
    lens: "Original historical thinking concept: Continuity and Change.",
    years: ["1914", "1916", "1917", "1918", "1919"],
    activeYear: "1916"
  },
  {
    unit: "Unit 1 · Cause and Consequence",
    title: "Help the Boys Recruitment Poster",
    date: "1917",
    image: "/history/assets/image12.png",
    alt: "A Canadian World War I recruitment poster.",
    source: "Canadian War Museum · 1917",
    tag: "WWI",
    copy: [
      "Timeline: 1914 Canada enters WW1. 1919 Canadian soldiers return from WW1.",
      "This recruitment poster was created in 1917 during WW1 to encourage Canadian men to join the army. As many soldiers were killed or wounded, Canada need more volunteers. The poster encouraged more men soldiers to support other soldiers who are fighting.",
      "This represents Cause and Consequence because the need for more Soldiers caused the government to create recruitment campaigns. I chose this poster because it clearly shows how war can led to an important government response."
    ],
    lens: "Original historical thinking concept: Cause and Consequence.",
    years: ["1914", "1916", "1917", "1918", "1919"],
    activeYear: "1917"
  },
  {
    unit: "Unit 1 · Historical Perspective",
    title: "Japanese Canadian in Uniform",
    date: "1917",
    image: "/history/assets/image11.png",
    alt: "Japanese Canadian soldier in military uniform during World War I.",
    source: "Canadian War Museum · 1917",
    tag: "Service",
    copy: [
      "Timeline: 1914 Canada enters WW1. 1919 Canadian soldiers return from WW1.",
      "This photograph shows a Japanese Canadian soldier serving in the Canadian Army during World War 1. Although many Japanese Canadians wanted to serve Canada, most were not allowed to enlist until 1916 because of discrimination. When Canada needed more volunteers, some Japanese Canadians were finally accepted into the military.",
      "This represents Historical Perspective because it helps us understand what the soldier might have been thinking and feeling. He may have wanted to protect Canada and prove that Japanese Canadians were loyal citizens. I chose this photograph because it reminds us that many people served their country even when they were not treated equally."
    ],
    lens: "Original historical thinking concept: Historical Perspective.",
    years: ["1914", "1916", "1917", "1918", "1919"],
    activeYear: "1917"
  },
  {
    unit: "Unit 2 · Continuity and Change",
    title: "Soup Kitchen During the Great Depression",
    date: "1931",
    image: "/history/assets/image2.jpg",
    alt: "Canadians waiting at a soup kitchen during the Great Depression.",
    source: "Government of Canada · c. 1931",
    tag: "Depression",
    copy: [
      "Timeline: 1929, 1933, 1935, 1939 Canadians enters WW2, 1945 Canadian leaves WW2.",
      "This photograph shows Canadians waiting at a soup kitchen during the Great Depression in the early 1930s. After the stock market crashed, many businesses closed and thousands of Canadians were left unemployed. Many families struggled to afford food and depend on soup kitchens for free meals.",
      "This represents Continuity and Change because life changed dramatically as poverty increased, while families and communities continued to help one another during this difficult time. I chose this photograph because it clearly shows how bad the Great Depression affected everyday lives in Canada."
    ],
    lens: "Original historical thinking concept: Continuity and Change.",
    years: ["1929", "1933", "1935", "1939", "1945"],
    activeYear: "1929"
  },
  {
    unit: "Unit 2 · Historical Perspective",
    title: "Japanese Canadians Forced to Leave Their Homes",
    date: "1942",
    image: "/history/assets/image3.jpg",
    alt: "Japanese Canadian families being relocated during World War II.",
    source: "Government of Canada · c. 1942",
    tag: "WWII",
    copy: [
      "Timeline: 1929, 1933, 1935, 1939 Canadians enters WW2, 1945 Canadians leaves WW2.",
      "This photograph shows Japanese Canadian families being forced to leave their homes after the Canadian government ordered their relocation in 1942. After Japan attacked Pearl Harbor, many Japanese Canadians were removed from the west coast of British Columbia and sent to internment camps, even though many were Canadian citizens.",
      "This represents historical perspective because it helps us understand how the discrimination of Japanese Canadians impacted their feeling after losing their houses, freedom, and the freedom in Canada."
    ],
    lens: "Original historical thinking concept: Historical Perspective.",
    years: ["1929", "1933", "1935", "1939", "1945"],
    activeYear: "1939"
  },
  {
    unit: "Unit 2 · Cause and Consequence",
    title: "D-Day at Juno Beach",
    date: "1944",
    image: "/history/assets/image10.png",
    alt: "Canadian soldiers landing at Juno Beach on D-Day.",
    source: "The Canadian Encyclopedia · c. 1944",
    tag: "D-Day",
    copy: [
      "Timeline: 1929, 1933, 1935, 1939 Canadian enters WW2, 1945 Canada leaves WW2.",
      "This photograph shows Canadian soldiers landing at Juno Beach on June 6, 1944, during the D-Day invasion of Normandy, Germany had occupied much of Europe during World War 2, so the Allied forces planned a large invasion to help liberate France. Canadian soldier landed on Juno Beach and successfully captured their territory while facing the deadly offensive of the German soldiers.",
      "This represents Cause and Consequence because Germany's occupation of Europe caused the Allies to launch the D-Day invasion. The invasion has lead to the defeat of the Nazi Germany and liberate Western Europe. I chose this photograph because it shows Canada's important role in military operations during World War 2."
    ],
    lens: "Original historical thinking concept: Cause and Consequence.",
    years: ["1929", "1933", "1935", "1939", "1945"],
    activeYear: "1945"
  },
  {
    unit: "Unit 3 · Continuity and Change",
    title: "The New Canadian Flag",
    date: "1965",
    image: "/history/assets/image8.png",
    alt: "The Canadian maple leaf flag.",
    source: "The Canadian Encyclopedia · c. 1965",
    tag: "Identity",
    copy: [
      "Timeline: 1945 Canadian leaves WW2, 1965, 1967, 1980, 1982.",
      "Before 1965, Canada commonly used the Canadian flag with a British Union Jack. This connects to Canada's relationship to Britain.",
      "This represents Continuity and Change because Canada was controlled under the British traditions, but adopted a flag that gave more independent identity."
    ],
    lens: "Original historical thinking concept: Continuity and Change.",
    years: ["1945", "1965", "1967", "1980", "1982"],
    activeYear: "1965"
  },
  {
    unit: "Unit 3 · Cause and Consequence",
    title: "Expo 67 and Habitat 67",
    date: "1967",
    image: "/history/assets/image4.png",
    alt: "Habitat 67 in Montreal during Expo 67.",
    source: "The Canadian Encyclopedia · c. 1967",
    tag: "Expo",
    copy: [
      "Timeline: 1945, 1965, 1967, 1980, 1982.",
      "This photograph shows Habitat 67 in Montreal, which is an innovative building house project build to celebrate Canada's 100th anniversary. Expo 67 was to show the culture and technology to visitors from around the world during Canada's Centennial.",
      "This shows Cause and Consequence because Canada's 100th anniversary celebration led to Expo 67, which then led to the construction of Habitat 67. This architecture was to symbolize Canada's innovation and technology mainly for visitors around the world."
    ],
    lens: "Original historical thinking concept: Cause and Consequence.",
    years: ["1945", "1965", "1967", "1980", "1982"],
    activeYear: "1967"
  },
  {
    unit: "Unit 3 · Historical Perspective",
    title: "Terry Fox and the Marathon of Hope",
    date: "1980",
    image: "/history/assets/image13.png",
    alt: "Terry Fox running during the Marathon of Hope.",
    source: "The Canadian Encyclopedia · c. 1980",
    tag: "Hope",
    copy: [
      "Timeline: 1945, 1965, 1967, 1980, 1982.",
      "This photograph shows Terry Fox running during the Marathon of Hope in 1980. Terry Fox decided to run across Canada to raise money and awareness for research on fighting for cancer.",
      "This represents Historical Perspective because it helps us remember how Terry Fox was a determined runner. I chose this because this inspires many people who are researching cancer today."
    ],
    lens: "Original historical thinking concept: Historical Perspective.",
    years: ["1945", "1965", "1967", "1980", "1982"],
    activeYear: "1980"
  },
  {
    unit: "Unit 4 · Continuity and Change",
    title: "Charter of Rights and Freedoms",
    date: "1982",
    image: "/history/assets/image6.png",
    alt: "Signing ceremony for the Canadian Charter of Rights and Freedoms.",
    source: "The Canadian Encyclopedia · c. 1982",
    tag: "Rights",
    copy: [
      "Timeline: 1982, 1990, 2001, 2008, 2010.",
      "This photograph shows the signature of the Queen of Great Britain during the Charter of Rights and Freedom in 1982. The Charter gave Canadians a stronger protection and freedom by making them part of the Constitution. Canada remained as a democracy country where canadian citizens can vote their government.",
      "This shows Continuity and Change because the Charter gave the country stronger protection for Canadians citizens, while Canada remained as democracy."
    ],
    lens: "Original historical thinking concept: Continuity and Change.",
    years: ["1982", "1990", "2001", "2008", "2010"],
    activeYear: "1982"
  },
  {
    unit: "Unit 4 · Cause and Consequence",
    title: "Canada's Mission in Afghanistan",
    date: "2001",
    image: "/history/assets/image1.png",
    alt: "Canadian soldiers serving in Afghanistan.",
    source: "The Canadian Encyclopedia · c. 2001",
    tag: "Mission",
    copy: [
      "Timeline: 1982, 1990, 2001, 2008, 2010.",
      "This photograph shows Canadians soldiers serving in Afghanistan. After the September 2001 terrorist attacks, Canada joined an international mission to stop terrorism.The Canadian soldiers work to improve Afghanistan's security and rebuildings more homes.",
      "This shows Cause and Consequences because the 911 terrorist attack caused Canadians to send troops in Afghanistan."
    ],
    lens: "Original historical thinking concept: Cause and Consequence.",
    years: ["1982", "1990", "2001", "2008", "2010"],
    activeYear: "2001"
  },
  {
    unit: "Unit 4 · Historical Thinking",
    title: "Truth and Reconciliation",
    date: "2008",
    image: "/history/assets/image9.png",
    alt: "A residential school building connected to Truth and Reconciliation.",
    source: "NCTR · c. 2008",
    tag: "Reckoning",
    copy: [
      "Timeline: 1982, 1990, 2001, 2008, 2010.",
      "This photograph shows a residential school where many children were forced to go. Many children that have a different culture were brought to residential schools separated from their families. The government wants to create the Truth and Reconciliation to listen to the survivors of reconciliation and remember their harmful experiences that they witnessed.",
      "This represents historical perspectives because it helps us understand the experiences of Indigenous people and why reconciliation is important today."
    ],
    lens: "Original historical thinking concept: Historical Perspective.",
    years: ["1982", "1990", "2001", "2008", "2010"],
    activeYear: "2008"
  },
  {
    kind: "reflection",
    unit: "Closing Reflection",
    title: "What I Learned From 100 Years of History",
    date: "1914-2010",
    image: "/history/assets/image9.png",
    alt: "Residential school building.",
    source: "Closing reflection",
    tag: "Reflect",
    copy: [
      "The Charter of Rights and Freedoms taught me that protecting people's rights are very important in democratic societies",
      "Truth and Reconciliation showed me that Canada must learn about their past mistakes and respect the Indigenous people",
      "Realized that Canada's mission to Afghanistan helped me learn that Canadians can support people around the world"
    ],
    lens: "Photographs make history feel specific: people, places, and choices become easier to understand.",
    years: ["1982", "1990", "2001", "2008", "2010"],
    activeYear: "2010"
  }
];

export default function HistoryPresentation() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const progress = useMemo(() => ((current + 1) / slides.length) * 100, [current]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setCurrent((value) => Math.min(slides.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setCurrent((value) => Math.max(0, value - 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="documentary">
      <section className={`heroFrame ${slide.kind || ""}`} aria-live="polite">
        <div className="filmPhoto">
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            priority={current === 0}
            sizes="(max-width: 920px) 100vw, 58vw"
          />
          <div className="grain" aria-hidden="true" />
        </div>

        <div className="storyPanel">
          <div className="slate">
            <span>{slide.unit}</span>
            <span>{slide.date}</span>
          </div>
          <h1>{slide.title}</h1>
          <div className="copy">
            {slide.copy.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
          <p className="lens">{slide.lens}</p>
          <div className="sourceLine">
            <span>{slide.source}</span>
            <strong>{slide.tag}</strong>
          </div>
        </div>
      </section>

      <section className="controlDeck" aria-label="Presentation controls">
        <button
          type="button"
          aria-label="Previous slide"
          title="Previous slide"
          onClick={() => setCurrent((value) => Math.max(0, value - 1))}
        >
          ‹
        </button>
        <div className="meter">
          <span>
            {String(current + 1).padStart(2, "0")} / {slides.length}
          </span>
          <i style={{ width: `${progress}%` }} />
        </div>
        <button
          type="button"
          aria-label="Next slide"
          title="Next slide"
          onClick={() => setCurrent((value) => Math.min(slides.length - 1, value + 1))}
        >
          ›
        </button>
      </section>

      <nav className="timelineStrip" aria-label="Slide timeline">
        {slides.map((item, index) => (
          <button
            key={`${item.title}-${item.date}`}
            className={index === current ? "active" : ""}
            type="button"
            onClick={() => setCurrent(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item.date}</strong>
            <em>{item.title}</em>
          </button>
        ))}
      </nav>

      {slide.years ? (
        <div className="yearRail" aria-label="Context years">
          {slide.years.map((year) => (
            <span className={year === slide.activeYear ? "active" : ""} key={year}>
              {year}
            </span>
          ))}
        </div>
      ) : null}
    </main>
  );
}
