"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const services = [
  {
    label: "Remote Hustle overview",
    image: "overview-workspace",
    heading: (
      <>
        Providing opportunities
        <br />
        <em>
          for the best
          <br />
          hands on deck.
        </em>
      </>
    ),
    copy: "Remote jobs, practical training, internships, and career resources. Make your next move with more confidence.",
    href: "/#rh-about",
    link: "Discover Remote Hustle",
  },
  {
    label: "Remote jobs",
    image: "remote-jobs",
    heading: (
      <>
        Find your next role.
        <br />
        <em>Make it remote.</em>
      </>
    ),
    copy: "Explore opportunities by what you do and where you can work. Find a role that fits your skills and ambitions.",
    href: "/jobs",
    link: "Explore opportunities",
  },
  {
    label: "Practical training",
    image: "learning-books",
    heading: (
      <>
        Skills that move
        <br />
        <em>with you.</em>
      </>
    ),
    copy: "Build practical skills and prepare for the work you want to do next.",
    href: "/programs",
    link: "Explore training",
  },
  {
    label: "Internships",
    image: "internship-steps",
    heading: (
      <>
        Experience starts
        <br />
        <em>somewhere.</em>
      </>
    ),
    copy: "Discover internship opportunities that help you put your knowledge to work.",
    href: "/programs?type=internship",
    link: "Explore internships",
  },
  {
    label: "Professional profile",
    image: "profile-documents",
    heading: (
      <>
        Your experience.
        <br />
        <em>In one place.</em>
      </>
    ),
    copy: "Bring your skills, CV, experience and preferences together in your professional profile.",
    href: "/workspace/profile",
    link: "Build your profile",
  },
  {
    label: "Career resources",
    image: "resource-guides",
    heading: (
      <>
        Show up
        <br />
        <em>prepared.</em>
      </>
    ),
    copy: "Resources and tools to help you take the next step in your remote career.",
    href: "/shop",
    link: "Explore resources",
  },
];
export function ServiceAccordion({
  content = {},
}: {
  content?: Record<string, Record<string, string>>;
}) {
  const [active, setActive] = useState(0),
    [mobile, setMobile] = useState(false);
  const [paused, setPaused] = useState(false),
    [visible, setVisible] = useState(true),
    [reduced, setReduced] = useState(false);
  const track = useRef<HTMLDivElement>(null),
    gallery = useRef<HTMLElement>(null);
  const blockers = useRef(new Set<string>());
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setBlocker = (name: string, value: boolean) => {
    if (value) blockers.current.add(name);
    else blockers.current.delete(name);
    setPaused(blockers.current.size > 0);
  };
  useEffect(() => {
    const size = matchMedia("(max-width: 680px)"),
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMobile(size.matches);
      setReduced(motion.matches);
    };
    const visibility = () => setBlocker("hidden", document.hidden);
    const release = () => setBlocker("contact", false);
    update();
    size.addEventListener("change", update);
    motion.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { threshold: 0.15 },
    );
    if (gallery.current) observer.observe(gallery.current);
    return () => {
      observer.disconnect();
      size.removeEventListener("change", update);
      motion.removeEventListener("change", update);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);
  useEffect(() => {
    if (paused || reduced || !visible) return;
    const timer = setTimeout(
      () => setActive((i) => (i + 1) % services.length),
      6000,
    );
    return () => clearTimeout(timer);
  }, [active, paused, reduced, visible]);
  useEffect(() => {
    if (!mobile || !track.current) return;
    const item = track.current.children[active] as HTMLElement;
    const left =
      item.offsetLeft -
      track.current.offsetLeft -
      (track.current.clientWidth - item.clientWidth) / 2;
    track.current.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [active, mobile, reduced]);
  const step = (n: number) =>
    setActive((i) => (i + n + services.length) % services.length);
  const syncScrolledCard = () => {
    if (!mobile || !track.current) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const element = track.current;
      if (!element) return;
      const centre = element.scrollLeft + element.clientWidth / 2;
      let nearest = 0,
        distance = Infinity;
      Array.from(element.children).forEach((child, index) => {
        const card = child as HTMLElement;
        const delta = Math.abs(
          card.offsetLeft - element.offsetLeft + card.clientWidth / 2 - centre,
        );
        if (delta < distance) {
          nearest = index;
          distance = delta;
        }
      });
      setActive(nearest);
    }, 160);
  };
  return (
    <section
      className="rh-hero-gallery"
      id="rh-services"
      ref={gallery}
      aria-label="Explore Remote Hustle services"
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") setBlocker("hover", true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") setBlocker("hover", false);
      }}
      onPointerDown={() => setBlocker("contact", true)}
      onTouchStart={() => setBlocker("touch", true)}
      onTouchEnd={(e) => setBlocker("touch", e.touches.length > 0)}
      onTouchCancel={() => setBlocker("touch", false)}
      onKeyDownCapture={() => setBlocker("focus", true)}
      onFocusCapture={(e) =>
        setBlocker("focus", e.target.matches(":focus-visible"))
      }
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          setBlocker("focus", false);
      }}
    >
      <h1 className="rh-a11y">
        Providing opportunities for the best hands on deck. Remote Hustle.
      </h1>
      <div
        className="rh-image-accordion"
        ref={track}
        role="group"
        aria-label="Services"
        onScroll={syncScrolledCard}
      >
        {services.map((service, i) => (
          <article
            key={service.label}
            className={"rh-service " + (i === active ? "is-active" : "")}
            data-rh-service-name={service.label}
          >
            <img
              className="rh-service-image"
              data-rh-photo={service.image}
              src={
                content["service-" + i]?.image_url ||
                "/photos/" + service.image + ".jpg"
              }
              alt=""
              width={1086}
              height={1448}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <button
              type="button"
              className="rh-service-trigger"
              aria-expanded={mobile || i === active}
              aria-controls={"service-body-" + i}
              id={"service-trigger-" + i}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? services.length - 1
                        : (i +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            services.length) %
                          services.length;
                  setActive(next);
                  (
                    track.current?.children[next].querySelector(
                      ".rh-service-trigger",
                    ) as HTMLElement
                  )?.focus();
                }
              }}
            >
              <span className="rh-service-indicator" aria-hidden="true" />
              <span className="rh-service-label" aria-hidden="true">
                {service.label}
              </span>
              <span className="rh-a11y">Explore {service.label}</span>
            </button>
            <div
              className="rh-service-body"
              id={"service-body-" + i}
              role="region"
              aria-labelledby={"service-trigger-" + i}
            >
              <h2>{service.heading}</h2>
              <p>{content["service-" + i]?.copy || service.copy}</p>
              <Link className="rh-service-link" href={service.href}>
                {service.link} <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="rh-mobile-card-controls">
              <div className="rh-card-progress" aria-hidden="true">
                <span
                  style={{ width: ((i + 1) * 100) / services.length + "%" }}
                />
              </div>
              <div className="rh-mobile-card-navigation">
                <button
                  type="button"
                  className="rh-round-button"
                  aria-label="Previous service"
                  onClick={() => step(-1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="rh-round-button"
                  aria-label="Next service"
                  onClick={() => step(1)}
                >
                  →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="rh-hero-footer">
        <span>Work. Learn. Move forward.</span>
        <div className="rh-hero-navigation">
          <button
            className="rh-round-button"
            aria-label="Previous service"
            onClick={() => step(-1)}
          >
            ←
          </button>
          <button
            className="rh-round-button"
            aria-label="Next service"
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
