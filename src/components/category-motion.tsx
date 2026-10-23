"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

const fields = [
  "Customer Support",
  "Virtual Assistance",
  "Software Development",
  "Design & Creative",
  "Writing & Content",
  "Digital Marketing",
  "Data & Analytics",
  "Project Management",
];
export function CategoryMotion({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = section.current;
    if (!root) return;
    const stage = root.querySelector<HTMLElement>(".rh-orbit-stage")!;
    const need = root.querySelector<HTMLElement>(".rh-need")!;
    const word = root.querySelector<HTMLElement>(".rh-need-word")!;
    const one = root.querySelector<HTMLElement>(".rh-brand-one")!;
    const two = root.querySelector<HTMLElement>(".rh-brand-two")!;
    const intro = root.querySelector<HTMLElement>(".rh-category-intro")!;
    const chips = Array.from(
      root.querySelectorAll<HTMLElement>(".rh-category"),
    );
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let played = false,
      animations: Animation[] = [];
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let wordTimer: ReturnType<typeof setInterval> | undefined;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      clearTimeout(finishTimer);
      clearInterval(wordTimer);
      clearTimeout(swapTimer);
      animations.forEach((animation) => animation.cancel());
      animations = [];
      word.classList.remove("rh-word-out");
    };
    const play = () => {
      if (played || preference.matches) return;
      played = true;
      const duration = 4200,
        bounds = stage.getBoundingClientRect(),
        small = bounds.width < 560;
      const centreX = bounds.width / 2,
        centreY = 122;
      const maxWidth = Math.max(
        ...chips.map((chip) => chip.getBoundingClientRect().width),
      );
      const radiusX = Math.max(10, (bounds.width - maxWidth - 26) / 2),
        radiusY = 101;
      const animate = (
        element: HTMLElement,
        frames: Keyframe[],
        options: KeyframeAnimationOptions = {},
      ) =>
        animations.push(
          element.animate(frames, {
            duration,
            fill: "both",
            easing: "linear",
            ...options,
          }),
        );
      chips.forEach((chip, index) => {
        const rect = chip.getBoundingClientRect(),
          left = rect.left - bounds.left,
          top = rect.top - bounds.top;
        const angle = (index / chips.length) * Math.PI * 2 - Math.PI / 2;
        const ringAt = (phase: number) =>
          `translate(${centreX + Math.cos(phase) * radiusX - rect.width / 2 - left}px,${centreY + Math.sin(phase) * radiusY - rect.height / 2 - top}px)`;
        const x = index % 2 ? 6 : -6;
        const start = small
          ? `translate(${x}px,${24 + (index % 3) * 10}px) rotate(${index % 2 ? 4 : -4}deg)`
          : `translate(${centreX + Math.sin(index * 2.1) * bounds.width * 0.25 - rect.width / 2 - left}px,${centreY + Math.cos(index * 1.7) * 80 - rect.height / 2 - top}px) rotate(${index % 2 ? 8 : -8}deg)`;
        animate(chip, [
          { transform: start, offset: 0 },
          {
            transform: small ? `translate(${-x}px,-7px)` : ringAt(angle),
            offset: 0.36,
            easing: "ease-in-out",
          },
          {
            transform: small ? `translate(${x}px,-3px)` : ringAt(angle + 0.25),
            offset: 0.58,
            easing: "cubic-bezier(.22,.65,.3,1)",
          },
          { transform: "translate(0,0)", offset: 1 },
        ]);
      });
      animate(need, [
        { opacity: 1, transform: "scale(1)", offset: 0 },
        { opacity: 1, offset: 0.48 },
        { opacity: 0, transform: "scale(.95)", offset: 0.61 },
        { opacity: 0, offset: 1 },
      ]);
      animate(
        one,
        [
          { opacity: 0, transform: "translateX(-70%)", offset: 0 },
          { opacity: 0, transform: "translateX(-70%)", offset: 0.54 },
          { opacity: 1, transform: "translateX(0)", offset: 0.85 },
          { opacity: 1, offset: 1 },
        ],
        { easing: "ease-in-out" },
      );
      animate(
        two,
        [
          { opacity: 0, transform: "translateX(70%)", offset: 0 },
          { opacity: 0, transform: "translateX(70%)", offset: 0.56 },
          { opacity: 1, transform: "translateX(0)", offset: 0.88 },
          { opacity: 1, offset: 1 },
        ],
        { easing: "ease-in-out" },
      );
      animate(intro, [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.83 },
        { opacity: 1, offset: 1 },
      ]);
      const words = ["Jobs", "Training", "Internships", "Resources"];
      let index = 0;
      wordTimer = setInterval(() => {
        index++;
        if (index >= words.length) {
          clearInterval(wordTimer);
          return;
        }
        word.classList.add("rh-word-out");
        swapTimer = setTimeout(() => {
          word.textContent = words[index];
          word.classList.remove("rh-word-out");
        }, 130);
      }, 560);
      finishTimer = setTimeout(finish, duration + 30);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) play();
      },
      { threshold: 0.3 },
    );
    observer.observe(root);
    preference.addEventListener("change", finish);
    window.addEventListener("resize", finish);
    return () => {
      observer.disconnect();
      finish();
      preference.removeEventListener("change", finish);
      window.removeEventListener("resize", finish);
    };
  }, [categories]);
  const choices = categories.length
    ? categories.slice(0, 12).map((category) => ({
        name: category.name,
        href: "/jobs?category=" + category.id,
      }))
    : fields.map((name) => ({
        name,
        href: "/jobs?q=" + encodeURIComponent(name),
      }));
  return (
    <section
      ref={section}
      className="rh-orbit rh-shell"
      id="rh-category-discovery"
      aria-label="Discover opportunities in your field"
    >
      <div className="rh-orbit-top">
        <div className="rh-overline">Discover opportunities in your field</div>
      </div>
      <div className="rh-orbit-stage">
        <div className="rh-orbit-title">
          <div className="rh-need" aria-hidden="true">
            <span>Need</span>
            <span>
              <span className="rh-need-word">Jobs</span>?
            </span>
          </div>
          <h2>
            <span className="rh-brand-line rh-brand-one">REMOTE HUSTLE</span>
            <span className="rh-brand-line rh-brand-two">
              <mark>got you.</mark>
            </span>
          </h2>
        </div>
        <p className="rh-category-intro">
          Pick your field. Find a role that fits your next step.
        </p>
        <div
          className="rh-category-pills"
          role="group"
          aria-label="Browse job categories"
        >
          {choices.map((choice) => (
            <Link className="rh-category" href={choice.href} key={choice.href}>
              {choice.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="rh-orbit-cta">
        <Link className="rh-button rh-button-yellow" href="/sign-up">
          Create your profile
        </Link>
      </div>
    </section>
  );
}
