(function () {
    "use strict";

    // --- Core Functions ---
    // --- Top Laser Progress Bar ---
    function getProgressBar() {
        let bar = document.getElementById('topProgressBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'topProgressBar';
            document.body.appendChild(bar);
        }
        return bar;
    }

    function startProgress() {
        const bar = getProgressBar();
        bar.style.opacity = '1';
        bar.style.width = '35%';
    }

    function completeProgress() {
        const bar = getProgressBar();
        bar.style.width = '100%';
        setTimeout(() => {
            bar.style.opacity = '0';
            setTimeout(() => {
                bar.style.width = '0';
            }, 300);
        }, 200);
    }

    function easeInOutQuad(t) {
        return t * (2 - t);
    }

    function smoothScroll(targetY, duration) {
        const startY = window.scrollY || document.documentElement.scrollTop;
        let start;
        window.requestAnimationFrame(function step(timestamp) {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            window.scrollTo(0, startY + (targetY - startY) * easeInOutQuad(progress));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        });
    }

    function updateActiveNavLink() {
        setTimeout(() => {
            const currentPagePath = window.location.pathname.split('/').pop();
            const navLinks = document.querySelectorAll('#navbarCollapse .nav-link');

            navLinks.forEach(link => {
                const linkPath = link.getAttribute('href');
                if (linkPath === currentPagePath || (currentPagePath === '' && linkPath === 'index.html')) {
                    link.classList.add('active');
                    link.setAttribute('aria-current', 'page');
                }
            });
        }, 100);
    }

    function initPageInteractions() {
        // Floating Back-to-top and Jump-links
        document.querySelectorAll('.back-to-top, .lnk').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (!href || href === '#') {
                    e.preventDefault();
                    smoothScroll(0, 400);
                    return;
                }
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        const navbarHeight = document.getElementById('includeNavbar') ? document.getElementById('includeNavbar').offsetHeight : 0;
                        const targetY = window.scrollY + targetEl.getBoundingClientRect().top - navbarHeight - 10;
                        smoothScroll(targetY, 400);
                    }
                }
            });
        });

        window.addEventListener('scroll', () => {
            const isScrolled = window.scrollY > 10;
            document.querySelectorAll('.back-to-top, .lnk').forEach(btn => {
                if (isScrolled) {
                    btn.classList.add('show');
                } else {
                    btn.classList.remove('show');
                }
            });
        }, { passive: true });

        // Cite (BibTeX Copy) Interaction
        document.querySelectorAll('.pub-cite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const bib = decodeURIComponent(btn.getAttribute('data-bibtex') || '');
                if (bib) {
                    navigator.clipboard.writeText(bib).then(() => {
                        const originalHTML = btn.innerHTML;
                        btn.classList.add('copied');
                        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                        setTimeout(() => {
                            btn.classList.remove('copied');
                            btn.innerHTML = originalHTML;
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy BibTeX:', err);
                    });
                }
            });
        });

        // Publication Filter & Live Search
        const searchInput = document.getElementById('pubSearchInput');
        const clearBtn = document.getElementById('pubSearchClear');
        const filterBtns = document.querySelectorAll('.pub-filter-btn');
        let currentFilter = 'all';

        function applyPubFilters() {
            const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
            if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

            let totalVisible = 0;
            const sections = document.querySelectorAll('.pub-category-section');

            sections.forEach(sec => {
                const cat = sec.getAttribute('data-category');
                const isCatActive = (currentFilter === 'all' || cat === currentFilter);
                let sectionVisibleCount = 0;

                const items = sec.querySelectorAll('.publication-item, .interest-card');
                items.forEach(item => {
                    const searchData = item.getAttribute('data-search') || item.textContent.toLowerCase();
                    const matchesQuery = !query || searchData.includes(query);

                    if (isCatActive && matchesQuery) {
                        item.style.display = '';
                        sectionVisibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                if (isCatActive && sectionVisibleCount > 0) {
                    sec.style.display = 'block';
                    totalVisible += sectionVisibleCount;
                } else {
                    sec.style.display = 'none';
                }
            });

            // Empty state message
            let emptyEl = document.getElementById('pubEmptyMsg');
            if (totalVisible === 0) {
                if (!emptyEl) {
                    emptyEl = document.createElement('div');
                    emptyEl.id = 'pubEmptyMsg';
                    emptyEl.className = 'pub-empty-msg';
                    emptyEl.innerHTML = '<i class="fa-solid fa-filter-circle-xmark"></i> No matching publications found.';
                    const pubContainer = document.getElementById('publications');
                    if (pubContainer) pubContainer.appendChild(emptyEl);
                }
                emptyEl.style.display = 'block';
            } else if (emptyEl) {
                emptyEl.style.display = 'none';
            }
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter') || 'all';
                applyPubFilters();
            });
        });

        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(applyPubFilters, 60);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                applyPubFilters();
                searchInput.focus();
            });
        }

        // News Expand/Collapse Interaction
        const newsToggleBtn = document.getElementById('newsToggleBtn');
        if (newsToggleBtn) {
            let isExpanded = false;
            newsToggleBtn.addEventListener('click', () => {
                isExpanded = !isExpanded;
                const extras = document.querySelectorAll('.news-item-extra');
                extras.forEach(el => {
                    el.style.display = isExpanded ? 'flex' : 'none';
                });
                const count = newsToggleBtn.getAttribute('data-count') || '';
                if (isExpanded) {
                    newsToggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Show Less';
                } else {
                    newsToggleBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> View Older News (${count} more)`;
                }
            });
        }

        // Project Expand/Collapse Interaction
        const projectToggleBtn = document.getElementById('projectToggleBtn');
        if (projectToggleBtn) {
            let isProjExpanded = false;
            projectToggleBtn.addEventListener('click', () => {
                isProjExpanded = !isProjExpanded;
                const extras = document.querySelectorAll('.project-item-extra');
                extras.forEach(el => {
                    el.style.display = isProjExpanded ? 'flex' : 'none';
                });
                const count = projectToggleBtn.getAttribute('data-count') || '';
                if (isProjExpanded) {
                    projectToggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Show Less';
                } else {
                    projectToggleBtn.innerHTML = `<i class="fa-solid fa-chevron-down"></i> View Full Projects History (${count} more)`;
                }
            });
        }
    }

    // --- Helpers ---
    function parseResourceMeta(url) {
        if (!url) return { label: 'Resource', icon: 'fa-solid fa-link', typeClass: 'type-link' };
        const urlLower = url.toLowerCase().trim();

        // 1. File Extensions
        if (urlLower.endsWith('.pdf')) {
            return { label: 'PDF Document', icon: 'fa-solid fa-file-pdf', typeClass: 'type-pdf' };
        }
        if (urlLower.endsWith('.zip') || urlLower.endsWith('.tar.gz') || urlLower.endsWith('.rar') || urlLower.endsWith('.7z')) {
            return { label: 'Code / Dataset', icon: 'fa-solid fa-file-zipper', typeClass: 'type-overleaf' };
        }

        // 2. Extract Hostname
        let host = '';
        try {
            host = new URL(url).hostname.toLowerCase();
            if (host.startsWith('www.')) host = host.substring(4);
        } catch (e) {
            host = urlLower;
        }

        // 3. Known Major Platforms
        if (host.includes('github.com')) return { label: 'GitHub Repository', icon: 'fa-brands fa-github', typeClass: 'type-drive' };
        if (host.includes('overleaf.com')) return { label: 'Overleaf Template', icon: 'fa-solid fa-file-code', typeClass: 'type-overleaf' };
        if (host.includes('drive.google.com') || host.includes('docs.google.com')) return { label: 'Google Drive', icon: 'fa-brands fa-google-drive', typeClass: 'type-drive' };
        if (host.includes('dropbox.com')) return { label: 'Dropbox', icon: 'fa-brands fa-dropbox', typeClass: 'type-drive' };
        if (host.includes('youtube.com') || host.includes('youtu.be')) return { label: 'YouTube Video', icon: 'fa-brands fa-youtube', typeClass: 'type-pdf' };
        if (host.includes('arxiv.org')) return { label: 'arXiv Preprint', icon: 'fa-solid fa-file-lines', typeClass: 'type-pdf' };
        if (host.includes('ieee.org')) return { label: 'IEEE Xplore', icon: 'fa-solid fa-book-open', typeClass: 'type-edu' };
        if (host.includes('acm.org')) return { label: 'ACM Digital Library', icon: 'fa-solid fa-bookmark', typeClass: 'type-acm' };
        if (host.includes('huggingface.co')) return { label: 'Hugging Face', icon: 'fa-solid fa-cube', typeClass: 'type-overleaf' };
        if (host.includes('kaggle.com')) return { label: 'Kaggle Dataset', icon: 'fa-solid fa-chart-column', typeClass: 'type-edu' };

        // 4. Universities (.edu / .edu.tw)
        if (host.includes('.edu')) {
            let schoolName = 'University';
            if (host.includes('mit.')) schoolName = 'MIT';
            else if (host.includes('nycu.')) schoolName = 'NYCU';
            else if (host.includes('ntu.')) schoolName = 'NTU';
            else if (host.includes('nthu.')) schoolName = 'NTHU';
            else if (host.includes('illinois.')) schoolName = 'UIUC';
            else if (host.includes('jhu.')) schoolName = 'JHU';
            else if (host.includes('stanford.')) schoolName = 'Stanford';
            else if (host.includes('berkeley.')) schoolName = 'UC Berkeley';
            else if (host.includes('cmu.')) schoolName = 'CMU';
            return { label: `${schoolName} Resource`, icon: 'fa-solid fa-building-columns', typeClass: 'type-edu' };
        }

        // 5. Automatic Fallback for ANY website
        const cleanHost = host.split('/')[0];
        return { label: cleanHost || 'External Link', icon: 'fa-solid fa-arrow-up-right-from-square', typeClass: 'type-link' };
    }

    function highlightAuthor(authors) {
        if (!authors) return "";
        const dashPattern = '[\\-\\u2010-\\u2015\\u2212]';
        const regex = new RegExp(`Lin,\\s*(Kuang|Guang)${dashPattern}(Hsun|Xun)`, 'g');
        return authors.replace(regex, (match, first, second) => {
            return `<b class="highlight-author">Lin, ${first}-${second}</b>`;
        });
    }

    function formatDateDisplay(dateStr, yearStr, monthStr) {
        if (dateStr && typeof dateStr === 'string' && dateStr.trim() !== '') {
            return dateStr.trim();
        }
        if (yearStr) {
            return monthStr ? `${yearStr}-${String(monthStr).padStart(2, '0')}` : String(yearStr);
        }
        return '';
    }

    function parseDateSort(dateStr, yearStr, monthStr) {
        if (dateStr) {
            const d = new Date(dateStr.replace(/-/g, '/'));
            if (!isNaN(d.getTime())) return d.getTime();
        }
        if (yearStr) {
            const m = monthStr ? parseInt(monthStr, 10) - 1 : 0;
            return new Date(parseInt(yearStr, 10), m, 1).getTime();
        }
        return 0;
    }

    function parseNewsDate(dateStr) {
        if (!dateStr) return { monthStr: '', dayStr: '', sortTime: 0 };
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { monthStr: '', dayStr: '', sortTime: 0 };
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            monthStr: monthNames[d.getMonth()] || '',
            dayStr: String(d.getDate()).padStart(2, '0'),
            sortTime: d.getTime()
        };
    }

    function parseAcademicTermSort(termStr) {
        if (!termStr) return 0;
        const s = String(termStr).trim();
        const yearMatch = s.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;
        let semesterVal = 0;
        const lower = s.toLowerCase();
        if (lower.includes('spring')) semesterVal = 1;
        else if (lower.includes('summer')) semesterVal = 2;
        else if (lower.includes('fall') || lower.includes('autumn')) semesterVal = 3;
        else if (lower.includes('winter')) semesterVal = 4;
        return year * 10 + semesterVal;
    }

    function sectionHeader(id, iconClass, title) {
        return `<div class="container py-1 px-2 bg-primary publication-section"><div class="row py-3 px-4" id="${id}"><h2 class="mb-3 mb-md-0 text-white text-uppercase font-weight-bold">${iconClass ? `<i class="${iconClass}"></i> ` : ''}${title}</h2></div></div>`;
    }

    // --- Component Generators ---
    function getSidebarHTML(photoUrl) {
        const imgUrl = photoUrl || "https://lh3.googleusercontent.com/pw/AP1GczMEUGdtwza6KiRmnTREfA0thaF_kQEe-NXd3ElLBzRKQUs7EDgs6OI9goAIPrtRlqyEdkZWDZtFWgWPwSpaU-Zh9K7rJaIFifrf7N7yRww3WUtLsD2xkBAB11K8CFhJmjPaNcYt-hRJwsd7XKCqgKC0rw=w232";
        return `<div class="sidebar-text d-flex flex-column h-100 justify-content-center text-center">` +
            `<img class="mx-auto d-block bg-primary img-fluid rounded-circle mb-4 p-3" src="${imgUrl}" alt="Kuang-Hsun Lin 林光勛" decoding="async" fetchpriority="high" title="Kuang-Hsun Lin 林光勛" width="125" height="125">` +
            `<h1 class="font-weight-bold">Kuang-Hsun Lin<br>林光勛</h1>` +
            `<small class="text-left mt-4"><div class="mb-2"><ul class="fa-ul">` +
            `<li><span class="fa-li"><i class="fa-solid fa-user" title="Position"></i></span>Assistant Professor</li>` +
            `<li><span class="fa-li"><i class="fa-solid fa-building-user" title="Affiliation"></i></span>ICE, NYCU, TW</li>` +
            `<li><span class="fa-li"><i class="fa-solid fa-envelope" title="Email"></i></span><span class="mm" data-v="pmqnsEs~hz3jiz3y|"></span></li>` +
            `<li><span class="fa-li"><i class="fa-solid fa-phone" title="Phone"></i></span><span class="pp" data-v="0==;282:<627676(:9:7<"></span></li>` +
            `<li><span class="fa-li"><i class="fa-solid fa-building" title="Office"></i></span>Office: ED828</li>` +
            `<li><span class="fa-li"><i class="fa-solid fa-building" title="Lab"></i></span>Lab: ED916</li>` +
            `</ul></div></small>` +
            `<small class="d-flex justify-content-center mb-3 mt-4">` +
            `<a class="btn btn-outline-primary mr-2" href="https://scholar.google.com/citations?user=pA0SI4cAAAAJ" title="Google Scholar" aria-label="Google Scholar Profile" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-google-scholar"></i></a>` +
            `<a class="btn btn-outline-primary mr-2" href="https://www.researchgate.net/profile/Kuang-Hsun-Lin-2" title="ResearchGate" aria-label="ResearchGate Profile" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-researchgate"></i></a>` +
            `<a class="btn btn-outline-primary mr-2" href="https://orcid.org/0000-0002-0426-9301" title="ORCID" aria-label="ORCID Profile" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-orcid"></i></a>` +
            `<br>` +
            `<a class="btn btn-outline-primary mr-2" href="https://www.linkedin.com/in/kuang-hsun-lin-65a317109/" title="LinkedIn" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-linkedin"></i></a>` +
            `<a class="btn btn-outline-primary mr-2" href="https://www.lens.org/lens/profile/khlin/" title="Lens" aria-label="Lens Profile" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-o"></i></a>` +
            `</small>` +
            `<div class="sidebar-cv-wrapper mb-3">` +
            `<a class="btn-sidebar-cv" href="cv.html" title="Curriculum Vitae / Academic CV"><span class="cv-icon-badge"><i class="fa-solid fa-file-invoice"></i></span> Curriculum Vitae <i class="fa-solid fa-chevron-right" style="font-size: 0.72rem; opacity: 0.8; margin-left: 2px;"></i></a>` +
            `</div>` +
            `<small class="text-justify mb-1 mt-2">Delight thyself also in the Lord: and he shall give thee the desires of thine heart. Commit thy way unto the Lord; trust also in him; and he shall bring it to pass.<p class="text-right">Psalm 37:4-5</p></small>` +
            `<small class="text-justify mb-1 mt-2">又要以耶和華為樂，他就將你心裡所求的賜給你。當將你的事交託耶和華，並倚靠他，他就必成全。<p class="text-right">詩篇37:4-5</p></small>` +
            `</div>`;
    }

    function getNavbarHTML() {
        return `<nav class="navbar navbar-expand-lg">` +
            `<div class="navbar-container">` +
            `<div class="navbar-nav-pill" id="navbarCollapse">` +
            `<a id="navbarHome" href="index.html" class="nav-link"><i class="fa-solid fa-house nav-icon"></i><span>Home</span></a>` +
            `<a id="navbarLab" href="lab.html" class="nav-link"><i class="fa-solid fa-flask nav-icon"></i><span>Lab</span></a>` +
            `<a id="navbarAbout" href="about.html" class="nav-link"><i class="fa-solid fa-user nav-icon"></i><span>About</span></a>` +
            `<a id="navbarPublication" href="publication.html" class="nav-link"><i class="fa-solid fa-book-open nav-icon"></i><span>Publication</span></a>` +
            `</div>` +
            `</div></nav>`;
    }

    function getFooterHTML() {
        const currentYear = new Date().getFullYear();
        return `<footer class="site-footer" role="contentinfo">` +
            `<div class="footer-inner">` +
            `<div class="footer-text">&copy; ${currentYear} Kuang-Hsun Lin (林光勛). All rights reserved. &bull; National Yang Ming Chiao Tung University (NYCU)</div>` +
            `</div></footer>`;
    }

    // --- Parser Functions ---
    function parseDashboardFromSheets(sheetsMap) {
        const res = {
            about: { content: "", photo: "" },
            interests: [],
            experience: [],
            education: [],
            tutorials: [],
            awards: [],
            courses: [],
            services: [],
            projects: [],
            welcome: []
        };

        // About sheet
        const aboutRows = sheetsMap['About'] || [];
        if (aboutRows.length > 1 && aboutRows[1]) {
            res.about.content = aboutRows[1][0] || "";
            res.about.photo = aboutRows[1][1] || "";
        }

        // Welcome sheet
        const welcomeRows = sheetsMap['Welcome'] || [];
        for (let i = 1; i < welcomeRows.length; i++) {
            const r = welcomeRows[i];
            if (r && r[0]) {
                res.welcome.push(r[0]);
            }
        }

        // Interest sheet
        const interestRows = sheetsMap['Interest'] || [];
        for (let i = 1; i < interestRows.length; i++) {
            const r = interestRows[i];
            if (r && r[0]) {
                res.interests.push({ item: r[0], desc: r[1] || "", icon: r[2] || "circle" });
            }
        }

        // Experience sheet
        const expRows = sheetsMap['Experience'] || [];
        for (let i = 1; i < expRows.length; i++) {
            const r = expRows[i];
            if (r && r[0]) {
                const sTime = r[2] ? new Date(String(r[2]).replace(/-/g, '/')).getTime() : 0;
                res.experience.push({
                    title: r[0],
                    affiliation: r[1] || "",
                    start: r[2] || "",
                    desc: r[3] || "",
                    end: r[4] || "",
                    sortTime: isNaN(sTime) ? 0 : sTime
                });
            }
        }
        res.experience.sort((a, b) => b.sortTime - a.sortTime);

        // Education sheet
        const eduRows = sheetsMap['Education'] || [];
        for (let i = 1; i < eduRows.length; i++) {
            const r = eduRows[i];
            if (r && r[0]) {
                res.education.push({ degree: r[0], dept: r[1] || "", univ: r[2] || "", start: r[3] || "", end: r[4] || "" });
            }
        }

        // Other sheet (Tutorials / Whitepapers)
        const otherRows = sheetsMap['Other'] || [];
        for (let i = 1; i < otherRows.length; i++) {
            const r = otherRows[i];
            if (r && r[0]) {
                res.tutorials.push({ title: r[0], authors: r[1] || "", event: r[2] || "", time: r[3] || "", url: r[4] || "" });
            }
        }

        // Award sheet
        const awardRows = sheetsMap['Award'] || [];
        for (let i = 1; i < awardRows.length; i++) {
            const r = awardRows[i];
            if (r && r[0]) {
                const yrMatch = String(r[2] || '').match(/\b(19\d\d|20\d\d)\b/);
                const yr = yrMatch ? parseInt(yrMatch[1], 10) : 0;
                res.awards.push({
                    title: r[0],
                    institute: r[1] || "",
                    time: r[2] || "",
                    desc: r[3] || "",
                    year: yr
                });
            }
        }
        res.awards.sort((a, b) => (b.year || 0) - (a.year || 0));

        // Course sheet
        const courseRows = sheetsMap['Course'] || [];
        for (let i = 1; i < courseRows.length; i++) {
            const r = courseRows[i];
            if (r && r[0]) {
                res.courses.push({ title: r[0], time: r[1] || "", resources: r[2] || "", sortVal: parseAcademicTermSort(r[1]) });
            }
        }
        res.courses.sort((a, b) => b.sortVal - a.sortVal);

        // Service sheet
        const serviceRows = sheetsMap['Service'] || [];
        for (let i = 1; i < serviceRows.length; i++) {
            const r = serviceRows[i];
            if (r && r[0]) {
                res.services.push({ title: r[0], affiliation: r[1] || "", time: r[2] || "" });
            }
        }

        // Project sheet
        const projRows = sheetsMap['Project'] || [];
        for (let i = 1; i < projRows.length; i++) {
            const r = projRows[i];
            if (r && r[0]) {
                const sTime = r[3] ? new Date(String(r[3]).replace(/-/g, '/')).getTime() : 0;
                res.projects.push({
                    title: r[0],
                    role: r[1] || "",
                    funder: r[2] || "",
                    start: r[3] || "",
                    end: r[4] || "",
                    sortTime: isNaN(sTime) ? 0 : sTime
                });
            }
        }
        res.projects.sort((a, b) => b.sortTime - a.sortTime);

        return res;
    }

    function parseDashboard(dashRows) {
        const res = {
            about: { content: "", photo: "" },
            interests: [],
            experience: [],
            education: [],
            tutorials: [],
            awards: [],
            courses: [],
            services: [],
            projects: [],
            welcome: []
        };
        if (!dashRows || !dashRows.length) return res;

        if (dashRows.length > 1 && dashRows[1]) {
            res.about.content = dashRows[1][0] || "";
            res.about.photo = dashRows[1][1] || "";
        }

        for (let i = 4; i < Math.min(dashRows.length, 11); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.interests.push({ item: r[0], desc: r[1] || "", icon: r[2] || "circle" });
            }
        }

        for (let i = 13; i < Math.min(dashRows.length, 16); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.experience.push({ title: r[0], affiliation: r[1] || "", start: r[2] || "", desc: r[3] || "", end: r[4] || "" });
            }
        }

        for (let i = 17; i < Math.min(dashRows.length, 20); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.education.push({ degree: r[0], dept: r[1] || "", univ: r[2] || "", start: r[3] || "", end: r[4] || "" });
            }
        }

        for (let i = 21; i < Math.min(dashRows.length, 25); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.tutorials.push({ title: r[0], authors: r[1] || "", event: r[2] || "", time: r[3] || "" });
            }
        }

        for (let i = 26; i < Math.min(dashRows.length, 32); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.awards.push({ title: r[0], institute: r[1] || "", time: r[2] || "", desc: r[3] || "" });
            }
        }

        for (let i = 33; i < Math.min(dashRows.length, 35); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.courses.push({ title: r[0], time: r[1] || "", resources: r[2] || "" });
            }
        }

        for (let i = 36; i < Math.min(dashRows.length, 38); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.services.push({ title: r[0], affiliation: r[1] || "", time: r[2] || "" });
            }
        }

        for (let i = 39; i < Math.min(dashRows.length, 44); i++) {
            const r = dashRows[i];
            if (r && r[0]) {
                res.projects.push({ title: r[0], role: r[1] || "", funder: r[2] || "", start: r[3] || "", end: r[4] || "" });
            }
        }

        for (let i = 45; i < Math.min(dashRows.length, 48); i++) {
            const r = dashRows[i];
            if (r && r[2]) {
                res.welcome.push(r[2]);
            }
        }

        return res;
    }

    function parseOrcid(orcidRows) {
        if (!orcidRows || orcidRows.length <= 1) return [];
        const pubs = [];
        for (let i = 1; i < orcidRows.length; i++) {
            const r = orcidRows[i];
            if (!r || !r[1]) continue;
            pubs.push({
                type: (r[0] || '').trim().toLowerCase(),
                title: r[1] || '',
                authors: r[2] || '',
                year: r[3] || '',
                month: r[4] || '',
                date: r[5] || '',
                venue: r[6] || '',
                volume: r[7] || '',
                number: r[8] || '',
                pages: r[9] || '',
                publisher: r[10] || '',
                doi: r[11] || '',
                pdf: r[12] || '',
                bibtex: r[13] || '',
                sortTime: parseDateSort(r[5], r[3], r[4])
            });
        }
        return pubs;
    }

    function parseMembers(memberRows) {
        if (!memberRows || memberRows.length <= 1) return [];
        const members = [];
        for (let i = 1; i < memberRows.length; i++) {
            const r = memberRows[i];
            if (!r || !r[0]) continue;
            members.push({
                name: r[0] || '',
                altName: r[1] || '',
                gender: (r[2] || '').trim().toUpperCase(),
                role: r[3] || '',
                img: r[4] || '',
                start: r[5] || '',
                end: r[6] || '',
                url: r[7] || ''
            });
        }
        return members;
    }

    function parseResourcesFromSheet(resourceRows) {
        const resources = [];
        if (!resourceRows || !resourceRows.length) return resources;
        for (let i = 1; i < resourceRows.length; i++) {
            const r = resourceRows[i];
            if (!r || !r.length || !r[0]) continue;
            const pin = (r[3] === true || String(r[3]).toUpperCase() === 'TRUE');
            resources.push({
                title: r[0] || '',
                desc: r[1] || '',
                date: r[2] || '',
                pin: pin,
                url: r[4] || '',
                sortTime: r[2] ? new Date(r[2]).getTime() : 0
            });
        }
        return resources;
    }

    function parseNewsAndResources(newsRows, directResourceRows) {
        if (directResourceRows && directResourceRows.length > 0) {
            const news = [];
            for (let i = 1; i < newsRows.length; i++) {
                const r = newsRows[i];
                if (!r || !r.length || !r[0]) continue;
                const pin = (r[3] === true || String(r[3]).toUpperCase() === 'TRUE');
                const dateInfo = parseNewsDate(r[2]);
                news.push({
                    title: r[0] || '',
                    desc: r[1] || '',
                    date: r[2] || '',
                    pin: pin,
                    url: r[4] || '',
                    category: r[5] || '',
                    monthStr: dateInfo.monthStr,
                    dayStr: dateInfo.dayStr,
                    sortTime: dateInfo.sortTime
                });
            }
            const resources = parseResourcesFromSheet(directResourceRows);
            return { news, resources };
        }

        const news = [];
        const resources = [];
        if (!newsRows || !newsRows.length) return { news, resources };

        let isResource = false;
        for (let i = 1; i < newsRows.length; i++) {
            const r = newsRows[i];
            if (!r || !r.length || !r[0]) {
                if (newsRows[i + 1] && newsRows[i + 1][0] === 'Title') {
                    isResource = true;
                    i++;
                }
                continue;
            }
            if (r[0] === 'Title') {
                isResource = true;
                continue;
            }

            const pin = (r[3] === true || String(r[3]).toUpperCase() === 'TRUE');
            if (!isResource) {
                const dateInfo = parseNewsDate(r[2]);
                news.push({
                    title: r[0] || '',
                    desc: r[1] || '',
                    date: r[2] || '',
                    pin: pin,
                    url: r[4] || '',
                    category: r[5] || '',
                    monthStr: dateInfo.monthStr,
                    dayStr: dateInfo.dayStr,
                    sortTime: dateInfo.sortTime
                });
            } else {
                resources.push({
                    title: r[0] || '',
                    desc: r[1] || '',
                    date: r[2] || '',
                    pin: pin,
                    url: r[4] || '',
                    sortTime: r[2] ? new Date(r[2]).getTime() : 0
                });
            }
        }
        return { news, resources };
    }

    // --- Page Template Renderers ---
    function renderAboutPage(dash) {
        const bioContent = (dash.about.content || "").replace(/(Kuang-Hsun Lin)/g, '<strong>$1</strong>');
        const photoUrl = dash.about.photo || "https://lh3.googleusercontent.com/pw/AP1GczMEUGdtwza6KiRmnTREfA0thaF_kQEe-NXd3ElLBzRKQUs7EDgs6OI9goAIPrtRlqyEdkZWDZtFWgWPwSpaU-Zh9K7rJaIFifrf7N7yRww3WUtLsD2xkBAB11K8CFhJmjPaNcYt-hRJwsd7XKCqgKC0rw=w232";

        return sectionHeader('about-sec', 'fa-solid fa-user', 'About') +
            `<div class="container bg-white pt-1 publication-section">` +
            `<div class="about-card">` +
            `<div class="about-image"><img class="img-fluid" src="${photoUrl}" loading="lazy" decoding="async" alt="Kuang-Hsun Lin 林光勛"></div>` +
            `<div class="about-text"><p>${bioContent}</p></div>` +
            `</div></div>`;
    }

    function renderInfoPage(dash) {
        let html = '';

        if (dash.interests.length > 0) {
            html += sectionHeader('interest', '', 'Research Interests');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.interests.forEach(item => {
                html += `<div class="interest-card"><div class="interest-icon"><i class="fa-solid fa-${item.icon}"></i></div><div class='interest-text'><h3 class="interest-title">${item.item}</h3><p class="interest-desc">${item.desc}</p></div></div>`;
            });
            html += `</div></div>`;
        }

        if (dash.education.length > 0) {
            html += sectionHeader('education', '', 'Education');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.education.forEach(edu => {
                const dateStr = edu.start + (edu.end ? `–${edu.end}` : '');
                html += `<div class="interest-card"><div class="interest-icon card-icon-edu"><i class="fa-solid fa-graduation-cap"></i></div><div class='interest-text'><h3 class="interest-title">${edu.degree}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    `<li><span class="fa-li"><i class="fa-solid fa-graduation-cap"></i></span>${edu.dept}</li>` +
                    `<li><span class="fa-li"><i class="fa-solid fa-school-flag"></i></span>${edu.univ}</li>` +
                    `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${dateStr}</li>` +
                    `</ul></div></div></div>`;
            });
            html += `</div></div>`;
        }

        if (dash.experience.length > 0) {
            html += sectionHeader('experience', '', 'Experiences');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.experience.forEach(exp => {
                const dateStr = exp.start + (exp.end ? `–${exp.end}` : '–');
                html += `<div class="interest-card"><div class="interest-icon card-icon-exp"><i class="fa-solid fa-briefcase"></i></div><div class='interest-text'><h3 class="interest-title">${exp.title}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    `<li><span class="fa-li"><i class="fa-solid fa-building-columns"></i></span>${exp.affiliation}</li>` +
                    `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${dateStr}</li>` +
                    (exp.desc ? `<li><span class="fa-li"><i class="fa-solid fa-note-sticky"></i></span>${exp.desc}</li>` : '') +
                    `</ul></div></div></div>`;
            });
            html += `</div></div>`;
        }

        if (dash.projects.length > 0) {
            const PROJECT_LIMIT = 3;
            const hasMoreProjects = dash.projects.length > PROJECT_LIMIT;
            html += sectionHeader('project', '', 'Projects');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.projects.forEach((proj, idx) => {
                const isExtra = idx >= PROJECT_LIMIT;
                const extraClass = isExtra ? ' project-item-extra' : '';
                const dateStr = proj.start ? (proj.start + (proj.end ? `–${proj.end}` : '')) : '';
                html += `<div class="interest-card${extraClass}"><div class="interest-icon card-icon-proj"><i class="fa-solid fa-diagram-project"></i></div><div class='interest-text'><h3 class="interest-title">${proj.title}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    (proj.role ? `<li><span class="fa-li"><i class="fa-solid fa-id-badge"></i></span>${proj.role}</li>` : '') +
                    (proj.funder ? `<li><span class="fa-li"><i class="fa-solid fa-landmark"></i></span>${proj.funder}</li>` : '') +
                    (dateStr ? `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${dateStr}</li>` : '') +
                    `</ul></div></div></div>`;
            });
            if (hasMoreProjects) {
                const extraCount = dash.projects.length - PROJECT_LIMIT;
                html += `<div class="news-expand-wrapper w-100" style="grid-column: 1 / -1;"><button class="news-expand-btn" id="projectToggleBtn" data-count="${extraCount}"><i class="fa-solid fa-chevron-down"></i> View Full Projects History (${extraCount} more)</button></div>`;
            }
            html += `</div></div>`;
        }

        if (dash.services.length > 0) {
            html += sectionHeader('service', '', 'Services');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.services.forEach(svc => {
                html += `<div class="interest-card"><div class="interest-icon"><i class="fa-solid fa-handshake"></i></div><div class='interest-text'><h3 class="interest-title">${svc.title}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    `<li><span class="fa-li"><i class="fa-solid fa-building-columns"></i></span>${svc.affiliation}</li>` +
                    (svc.time ? `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${svc.time}</li>` : '') +
                    `</ul></div></div></div>`;
            });
            html += `</div></div>`;
        }

        if (dash.courses.length > 0) {
            html += sectionHeader('course', '', 'Courses');
            html += `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            dash.courses.forEach(c => {
                html += `<div class="interest-card"><div class="interest-icon"><i class="fa-solid fa-chalkboard-user"></i></div><div class='interest-text'><h3 class="interest-title">${c.title}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    (c.time ? `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${c.time}</li>` : '') +
                    (c.resources ? `<li><span class="fa-li"><i class="fa-solid fa-link"></i></span><a href="${c.resources}" target="_blank" style="text-decoration: underline;">Course Resources</a></li>` : '') +
                    `</ul></div></div></div>`;
            });
            html += `</div></div>`;
        }

        return html;
    }

    function renderPublicationPage(pubs, dash) {
        const journals = pubs.filter(p => p.type === 'article').sort((a, b) => b.sortTime - a.sortTime);
        const conferences = pubs.filter(p => p.type === 'inproceedings').sort((a, b) => b.sortTime - a.sortTime);
        const patents = pubs.filter(p => p.type === 'misc').sort((a, b) => b.sortTime - a.sortTime);
        const awards = dash.awards || [];
        const tutorials = dash.tutorials || [];
        const totalCount = journals.length + conferences.length + patents.length + awards.length + tutorials.length;

        // Toolbar: Search Bar + Filter Pills
        let html = `<div class="pub-toolbar">` +
            `<div class="pub-search-wrapper">` +
            `<i class="fa-solid fa-magnifying-glass pub-search-icon"></i>` +
            `<input type="text" id="pubSearchInput" class="pub-search-input" placeholder="Search publications by keyword, title, author, venue, year..." aria-label="Search publications">` +
            `<button id="pubSearchClear" class="pub-search-clear" style="display: none;" title="Clear search"><i class="fa-solid fa-xmark"></i></button>` +
            `</div>` +
            `<div class="pub-filter-container">` +
            `<button class="pub-filter-btn active" data-filter="all">All <span class="pub-filter-count">${totalCount}</span></button>` +
            `<button class="pub-filter-btn" data-filter="journal"><i class="fa-solid fa-book"></i> Journals <span class="pub-filter-count">${journals.length}</span></button>` +
            `<button class="pub-filter-btn" data-filter="conference"><i class="fa-solid fa-note-sticky"></i> Conferences <span class="pub-filter-count">${conferences.length}</span></button>` +
            `<button class="pub-filter-btn" data-filter="patent"><i class="fa-solid fa-lightbulb"></i> Patents <span class="pub-filter-count">${patents.length}</span></button>` +
            `<button class="pub-filter-btn" data-filter="award"><i class="fa-solid fa-award"></i> Awards <span class="pub-filter-count">${awards.length}</span></button>` +
            `<button class="pub-filter-btn" data-filter="other">Others <span class="pub-filter-count">${tutorials.length}</span></button>` +
            `</div></div>`;

        const renderListItems = (list) => {
            return list.map(pub => {
                const dateDisplay = formatDateDisplay(pub.date, pub.year, pub.month);
                const isPatent = pub.type === 'misc' || (pub.venue && pub.venue.toLowerCase() === 'patent');
                const venueIcon = isPatent ? 'fa-lightbulb' : (pub.type === 'inproceedings' ? 'fa-note-sticky' : 'fa-book');
                
                let venueText = pub.venue || '';
                if (isPatent) {
                    const patentParts = [pub.publisher, pub.number].filter(Boolean).join(' ');
                    venueText = patentParts || pub.venue || 'Patent';
                }

                const searchContent = `${pub.title} ${pub.authors} ${venueText} ${dateDisplay} ${pub.year}`.toLowerCase();
                const citeBtn = pub.bibtex ? ` <button class="pub-cite-btn" data-bibtex="${encodeURIComponent(pub.bibtex)}" title="Copy BibTeX Citation"><i class="fa-solid fa-quote-right"></i> Cite</button>` : '';

                return `<li class="publication-item" data-sort="${pub.sortTime}" data-search="${searchContent.replace(/"/g, '&quot;')}">` +
                    `<div class="pub-main"><h3 class="pub-title">` +
                    (pub.doi ? `<a href="${pub.doi}" target="_blank" rel="noopener noreferrer">${pub.title}</a>` : pub.title) +
                    (pub.pdf ? ` <a class="pub-pdf-link" title="Download PDF" aria-label="Download PDF" href="${pub.pdf}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i></a>` : '') +
                    citeBtn +
                    `</h3><div class="pub-tags-row">` +
                    `<span class="pub-tag tag-authors"><i class="fa-solid fa-user-group"></i> <span>${highlightAuthor(pub.authors)}</span></span>` +
                    (venueText ? `<span class="pub-tag tag-venue"><i class="fa-solid ${venueIcon}"></i> <span>${venueText}</span></span>` : '') +
                    (dateDisplay ? `<span class="pub-tag tag-date"><i class="fa-solid fa-calendar-days"></i> <span>${dateDisplay}</span></span>` : '') +
                    `</div></div></li>`;
            }).join('');
        };

        // 1. Journals
        if (journals.length > 0) {
            html += `<div class="pub-category-section" data-category="journal">` +
                sectionHeader('journal', 'fa-solid fa-book', 'Journal Articles') +
                `<div class="container bg-white pt-1 publication-section"><ol class="publication-list">${renderListItems(journals)}</ol></div>` +
                `</div>`;
        }

        // 2. Conferences
        if (conferences.length > 0) {
            html += `<div class="pub-category-section" data-category="conference">` +
                sectionHeader('conference', 'fa-solid fa-note-sticky', 'Conference & Proceeding Papers') +
                `<div class="container bg-white pt-1 publication-section"><ol class="publication-list">${renderListItems(conferences)}</ol></div>` +
                `</div>`;
        }

        // 3. Patents
        if (patents.length > 0) {
            html += `<div class="pub-category-section" data-category="patent">` +
                sectionHeader('patent', 'fa-solid fa-lightbulb', 'Patents') +
                `<div class="container bg-white pt-1 publication-section"><ol class="publication-list">${renderListItems(patents)}</ol></div>` +
                `</div>`;
        }

        // 4. Awards
        if (awards.length > 0) {
            html += `<div class="pub-category-section" data-category="award">` +
                sectionHeader('award', 'fa-solid fa-award', 'Awards') +
                `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            awards.forEach(aw => {
                const searchContent = `${aw.title} ${aw.institute} ${aw.desc} ${aw.time}`.toLowerCase();
                html += `<div class="interest-card" data-search="${searchContent.replace(/"/g, '&quot;')}"><div class="interest-icon card-icon-award"><i class="fa-solid fa-award"></i></div><div class='interest-text'><h3 class="interest-title">${aw.title}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    `<li><span class="fa-li"><i class="fa-solid fa-building-columns"></i></span>${aw.institute}</li>` +
                    (aw.desc ? `<li><span class="fa-li"><i class="fa-solid fa-note-sticky"></i></span>${aw.desc}</li>` : '') +
                    (aw.time ? `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${aw.time}</li>` : '') +
                    `</ul></div></div></div>`;
            });
            html += `</div></div></div>`;
        }

        // 5. Others
        if (tutorials.length > 0) {
            html += `<div class="pub-category-section" data-category="other">` +
                sectionHeader('other', '', 'Others') +
                `<div class="container bg-white pt-1 publication-section"><div class="interest-grid">`;
            tutorials.forEach(tut => {
                const searchContent = `${tut.title} ${tut.authors} ${tut.event} ${tut.time}`.toLowerCase();
                const titleHtml = tut.url ? `<a href="${tut.url}" target="_blank" rel="noopener noreferrer">${tut.title} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; margin-left: 4px;"></i></a>` : tut.title;
                html += `<div class="interest-card" data-search="${searchContent.replace(/"/g, '&quot;')}"><div class="interest-icon"><i class="fa-solid fa-file-lines"></i></div><div class='interest-text'><h3 class="interest-title">${titleHtml}</h3><div class="list-item-details"><ul class="fa-ul education-details">` +
                    (tut.authors ? `<li><span class="fa-li"><i class="fa-solid fa-user-group"></i></span>${highlightAuthor(tut.authors)}</li>` : '') +
                    `<li><span class="fa-li"><i class="fa-solid fa-calendar-days"></i></span>${tut.event} (${tut.time})</li>` +
                    `</ul></div></div></div>`;
            });
            html += `</div></div></div>`;
        }

        return html;
    }

    function renderLabPage(dash, members, newsData) {
        let html = '';

        if (dash.welcome && dash.welcome.length > 0) {
            html += sectionHeader('welcome', '', 'Welcome');
            html += `<div class="container bg-white pt-1 publication-section"><div class="about-card welcome-card"><div class="about-text w-100">`;
            dash.welcome.forEach(msg => {
                html += `<p>${msg}</p>`;
            });
            html += `</div></div></div>`;
        }

        if (newsData.news && newsData.news.length > 0) {
            const sortedNews = [...newsData.news].sort((a, b) => {
                if (a.pin !== b.pin) return a.pin ? -1 : 1;
                return b.sortTime - a.sortTime;
            });

            const INITIAL_LIMIT = 5;
            const hasMore = sortedNews.length > INITIAL_LIMIT;

            html += sectionHeader('news', '', 'News');
            html += `<div class="container bg-white pt-1 publication-section"><div class="news-grid">`;
            sortedNews.forEach((n, idx) => {
                const isExtra = idx >= INITIAL_LIMIT && !n.pin;
                const extraClass = isExtra ? ' news-item-extra' : '';
                const catSlug = (n.category || '').toLowerCase().replace(/\s+/g, '-');

                html += `<div class="news-card${extraClass}"><div class="news-card-header">` +
                    (n.monthStr ? `<div class="news-date-box"><span class="date-month">${n.monthStr}</span><span class="date-day">${n.dayStr}</span></div>` : '') +
                    `<div class="news-badge-container">` +
                    (n.category ? `<span class="news-badge badge-${catSlug}">${n.category}</span>` : '') +
                    (n.pin ? `<i class="fa-solid fa-thumbtack pin-icon"></i>` : '') +
                    `</div></div>` +
                    `<div class="news-card-body"><h3 class="news-title">` +
                    (n.url ? `<a href="${n.url}" target="_blank" rel="noopener noreferrer">${n.title}</a>` : n.title) +
                    `</h3>` +
                    (n.desc ? `<div class="news-text">${n.desc}</div>` : '') +
                    `</div></div>`;
            });

            if (hasMore) {
                const extraCount = sortedNews.length - INITIAL_LIMIT;
                html += `<div class="news-expand-wrapper"><button class="news-expand-btn" id="newsToggleBtn" data-count="${extraCount}"><i class="fa-solid fa-chevron-down"></i> View Older News (${extraCount} more)</button></div>`;
            }

            html += `</div></div>`;
        }

        if (members && members.length > 0) {
            const roleOrder = { "advisor": 1, "postdoc": 2, "phd": 3, "ms": 4, "ra": 5, "ea": 6 };
            const sortedMembers = [...members].sort((a, b) => {
                const isCurrentA = !a.end ? 0 : 1;
                const isCurrentB = !b.end ? 0 : 1;
                if (isCurrentA !== isCurrentB) return isCurrentA - isCurrentB;
                const rankA = roleOrder[(a.role || '').toLowerCase()] || 99;
                const rankB = roleOrder[(b.role || '').toLowerCase()] || 99;
                if (rankA !== rankB) return rankA - rankB;
                return (b.start || '').localeCompare(a.start || '');
            });

            const currentMembers = sortedMembers.filter(m => !m.end || m.end.trim() === '');
            const alumniMembers = sortedMembers.filter(m => m.end && m.end.trim() !== '');

            const renderMemberCards = (list) => {
                return list.map(m => {
                    const genderIcon = m.gender === 'M' ? ' <i class="fa-solid fa-mars icon-m"></i>' : (m.gender === 'F' ? ' <i class="fa-solid fa-venus icon-f"></i>' : '');
                    const imgTag = m.img ? `<img src="${m.img}" onerror="this.src='https://via.placeholder.com/150'" alt="${m.name}" class="member-img" width="64" height="64" loading="lazy" decoding="async">` : `<div class="member-img avatar-placeholder avatar-${m.gender === 'F' ? 'f' : (m.gender === 'M' ? 'm' : 'default')}"><i class="fa-solid fa-user"></i></div>`;
                    const dateRange = m.start ? `<p class="member-desc"><i class="fa-solid fa-calendar-days"></i> ${m.start} – ${m.end || 'Present'}</p>` : '';

                    return `<div class="member-card">${imgTag}<div class="member-info">` +
                        `<h3 class="member-name">${m.url ? `<a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.name}</a>` : m.name}${genderIcon}</h3>` +
                        (m.altName ? `<div class="member-name-alt">${m.altName}</div>` : '') +
                        (m.role ? `<div class="member-role">${m.role}</div>` : '') +
                        dateRange +
                        `</div></div>`;
                }).join('');
            };

            // Current Members
            if (currentMembers.length > 0) {
                const titleText = alumniMembers.length > 0 ? 'Current Members' : 'Members';
                html += sectionHeader('members', '', titleText);
                html += `<div class="container bg-white pt-1 publication-section"><div class="member-grid">${renderMemberCards(currentMembers)}</div></div>`;
            }

            // Alumni Members (Only rendered if any exist)
            if (alumniMembers.length > 0) {
                html += sectionHeader('alumni', '', 'Alumni');
                html += `<div class="container bg-white pt-1 publication-section"><div class="member-grid">${renderMemberCards(alumniMembers)}</div></div>`;
            }
        }

        if (newsData.resources && newsData.resources.length > 0) {
            const sortedRes = [...newsData.resources].sort((a, b) => {
                if (a.pin !== b.pin) return a.pin ? -1 : 1;
                return b.sortTime - a.sortTime;
            });

            html += sectionHeader('resources', 'fa-solid fa-folder-open', 'Resources & Lab Tools');
            html += `<div class="container bg-white pt-1 publication-section"><div class="resource-grid">`;
            sortedRes.forEach(r => {
                const meta = parseResourceMeta(r.url);
                const pinBadge = r.pin ? `<span class="resource-pin-chip"><i class="fa-solid fa-thumbtack"></i> Pinned</span>` : '';
                const dateHtml = r.date ? `<span class="resource-date-tag"><i class="fa-regular fa-calendar-days"></i> ${r.date}</span>` : '';

                html += `<div class="resource-card">` +
                    `<div class="resource-card-left">` +
                    `<div class="resource-icon-box ${meta.typeClass}"><i class="${meta.icon}"></i></div>` +
                    `</div>` +
                    `<div class="resource-card-body">` +
                    `<div class="resource-header-row">` +
                    `<h3 class="resource-title">` +
                    (r.url ? `<a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title} <i class="fa-solid fa-arrow-up-right-from-square resource-ext-icon"></i></a>` : r.title) +
                    `</h3>` +
                    pinBadge +
                    `</div>` +
                    (r.desc ? `<p class="resource-desc-text">${r.desc}</p>` : '') +
                    `<div class="resource-tags-row">` +
                    `<span class="resource-source-badge ${meta.typeClass}"><i class="${meta.icon}"></i> ${meta.label}</span>` +
                    dateHtml +
                    `</div>` +
                    `</div></div>`;
            });
            html += `</div></div>`;
        }

        return html;
    }

    // --- Main Data Loader ---
    const CACHE_KEY = 'site_data_cache_v28';

    const sheetNames = [
        'About',
        'Welcome',
        'Interest',
        'Experience',
        'Education',
        'Award',
        'Course',
        'Service',
        'Project',
        'Other',
        'Member',
        'News',
        'Resource',
        'ORCID'
    ];

    const ranges = sheetNames.map(name => `${name}!A1:Z`);

    function renderAllContent(rawData) {
        const sheetsMap = {};
        if (rawData && rawData.valueRanges) {
            rawData.valueRanges.forEach(vr => {
                const rangeStr = vr.range || '';
                // Extracts sheet title from range, e.g. "About!A1:Z50" or "'About'!A1:Z50"
                const titleMatch = rangeStr.match(/^'?([^'!]+)'?!/);
                if (titleMatch && titleMatch[1]) {
                    sheetsMap[titleMatch[1]] = vr.values || [];
                }
            });
        }

        // Support both new multi-sheet structure and legacy single Dashboard fallback
        let dash;
        if (sheetsMap['About'] || sheetsMap['Project'] || sheetsMap['Experience']) {
            dash = parseDashboardFromSheets(sheetsMap);
        } else {
            const legacyDashRows = rawData.valueRanges[0]?.values || [];
            dash = parseDashboard(legacyDashRows);
        }

        const orcidRows = sheetsMap['ORCID'] || rawData.valueRanges?.find(vr => vr.range?.includes('ORCID'))?.values || [];
        const memberRows = sheetsMap['Member'] || rawData.valueRanges?.find(vr => vr.range?.includes('Member'))?.values || [];
        const newsRows = sheetsMap['News'] || rawData.valueRanges?.find(vr => vr.range?.includes('News'))?.values || [];
        const resourceRows = sheetsMap['Resource'] || [];

        const pubs = parseOrcid(orcidRows);
        const members = parseMembers(memberRows);
        const newsData = parseNewsAndResources(newsRows, resourceRows);

        const advisorImg = members.find(m => m.name === 'Kuang-Hsun Lin' || (m.role && m.role.toLowerCase() === 'advisor'))?.img || "https://lh3.googleusercontent.com/pw/AP1GczMEUGdtwza6KiRmnTREfA0thaF_kQEe-NXd3ElLBzRKQUs7EDgs6OI9goAIPrtRlqyEdkZWDZtFWgWPwSpaU-Zh9K7rJaIFifrf7N7yRww3WUtLsD2xkBAB11K8CFhJmjPaNcYt-hRJwsd7XKCqgKC0rw=w232";

        const sidebarEl = document.getElementById('includeSidebar');
        if (sidebarEl) sidebarEl.innerHTML = getSidebarHTML(advisorImg);

        const navbarEl = document.getElementById('includeNavbar');
        if (navbarEl) navbarEl.innerHTML = getNavbarHTML();

        const infoEl = document.getElementById('info');
        if (infoEl) infoEl.innerHTML = renderInfoPage(dash);

        const aboutEl = document.getElementById('about');
        if (aboutEl) aboutEl.innerHTML = renderAboutPage(dash);

        const pubEl = document.getElementById('publications');
        if (pubEl) pubEl.innerHTML = renderPublicationPage(pubs, dash);

        const labEl = document.getElementById('lab');
        if (labEl) labEl.innerHTML = renderLabPage(dash, members, newsData);

        // Inject Universal Footer
        const mainContentEl = document.getElementById('mainContent');
        if (mainContentEl) {
            let footerEl = document.getElementById('siteFooter');
            if (!footerEl) {
                footerEl = document.createElement('div');
                footerEl.id = 'siteFooter';
                mainContentEl.appendChild(footerEl);
            }
            footerEl.innerHTML = getFooterHTML();
        }

        // Session-only subtle entrance animation
        if (!sessionStorage.getItem('site_intro_played')) {
            const activeContainer = infoEl || aboutEl || pubEl || labEl;
            if (activeContainer) {
                activeContainer.classList.add('first-session-entrance');
            }
            sessionStorage.setItem('site_intro_played', '1');
        }

        updateActiveNavLink();
        initPageInteractions();
        completeProgress();
    }

    function loadSiteData() {
        startProgress();
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(`${CACHE_KEY}_timestamp`);
        let hasRenderedCache = false;

        // Stale-While-Revalidate: Instant render from cache if available (< 1ms)
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                renderAllContent(parsed);
                hasRenderedCache = true;
                
                // If cache is fresh (< 30 mins), avoid background re-fetch
                if (cachedTimestamp && (Date.now() - parseInt(cachedTimestamp, 10)) < (30 * 60 * 1000)) {
                    return;
                }
            } catch (e) {
                console.warn('Cache parse failed, fetching fresh data...', e);
            }
        }

        const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/1EsbqSfOS97txN7_nwxpujdkV3g6scHB24TSAaJ25AMo/values:batchGet?${ranges.map(r => `ranges=${r}`).join('&')}&valueRenderOption=FORMATTED_VALUE&key=AIzaSyD8sJOgRFmGvQ6T5X-PjwVfpEsb8pG2y2o`;

        fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                return res.json();
            })
            .then(data => {
                const newDataStr = JSON.stringify(data);
                if (newDataStr !== cachedData) {
                    renderAllContent(data);
                }
                localStorage.setItem(CACHE_KEY, newDataStr);
                localStorage.setItem(`${CACHE_KEY}_timestamp`, Date.now().toString());
            })
            .catch(err => {
                console.error('Failed to load site data from Google Sheets:', err);
                if (!hasRenderedCache) {
                    ['info', 'about', 'publications', 'lab'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.innerHTML = '<div class="container p-4 text-center text-muted">無法載入內容，請稍後再試。</div>';
                    });
                }
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSiteData);
    } else {
        loadSiteData();
    }

    // Email & Phone Obfuscation Decoder (Multi-instance safe)
    const emailKey = 5;
    function decodeSecureContacts() {
        document.querySelectorAll('span.mm').forEach(target => {
            if (target.querySelector('a')) return;
            const encodedStr = target.getAttribute('data-v');
            if (encodedStr) {
                const decoded = encodedStr.split('').map(char =>
                    String.fromCharCode(char.charCodeAt(0) - emailKey)
                ).join('');
                target.innerHTML = `<a href="mailto:${decoded}">${decoded}</a>`;
            }
        });

        document.querySelectorAll('span.pp').forEach(target => {
            if (target.textContent) return;
            const encodedStr = target.getAttribute('data-v');
            if (encodedStr) {
                const decoded = encodedStr.split('').map(char =>
                    String.fromCharCode(char.charCodeAt(0) - emailKey)
                ).join('');
                target.textContent = decoded;
            }
        });
    }

    const secureContactObserver = new MutationObserver(() => {
        decodeSecureContacts();
    });

    secureContactObserver.observe(document.body, { childList: true, subtree: true });
    decodeSecureContacts();
})();
