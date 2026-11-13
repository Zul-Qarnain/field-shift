# NASA Space Apps Challenge — Project Analysis, Development, ML Training & Final Validation

## 1. Your Role and Main Objective

Act as the **Lead AI Engineer, Research Analyst, ML Engineer, and Project Integrator** for this project.

I am providing you with:

- The official NASA Space Apps Challenge website URL.
- Access to my local project source code.
- The **Obscura browser** for browsing and interacting with websites.
- Access to my local coding-agent tools.
- Kaggle CLI access for dataset processing and model training.

**Important:** I am no longer using Playwright. Use Obscura for browser automation and website inspection. Do not introduce Playwright into this workflow.

The project must be analyzed and improved according to the actual challenge description published by NASA. Do not make assumptions about the challenge requirements without first reading the official information.

**Deadline: Approximately two hours.** Prioritize completing a working, demonstrable, submission-ready project over unnecessary experimentation or large architectural changes.

## 2. First: Understand the Official NASA Challenge

Before modifying any code, visit the NASA Space Apps Challenge website using Obscura.

Read and analyze:

- The complete official challenge summary.
- The problem statement and its objectives.
- The expected solution and deliverables.
- The scientific and technical requirements.
- NASA's recommended datasets and resources.
- NASA's listed partner organizations and their datasets.
- Any specific requirements relevant to farmers, agricultural adaptation, climate, crop selection, and planting schedules.

Translate the challenge description into a clear technical plan.

Identify exactly:

1. What problem are we solving?
2. Who are the intended users?
3. What information should farmers provide?
4. What outputs should our application generate?
5. What NASA datasets are relevant?
6. What scientific evidence is needed to support the recommendations?
7. How should the machine learning model contribute to the solution?

The latest official NASA challenge description takes priority over outdated assumptions or existing project documentation.

## 3. Parallel Agent Execution

Use a parallel-agent workflow to accelerate development. You are responsible for coordinating the agents, reviewing their work, resolving conflicts, and integrating everything into one functional application.

First, inspect the available local tools and determine how to invoke them.

Use the following agents where supported:

| Agent | Responsibility |
|---|---|
| Agent 1 — NASA Research | Analyze the official challenge, requirements, scientific background, and NASA resources. |
| Agent 2 — Dataset Research | Identify appropriate NASA and NASA-partner datasets and verify their availability, relevance, and documentation. |
| Agent 3 — Frontend Developer | Inspect and improve the existing website, UI, content, and user experience. |
| Agent 4 — ML Engineer | Develop the data-processing pipeline, select models, train and export the final model using Kaggle. |
| Agent 5 — Validation Engineer | Evaluate model performance, check recommendations, and find reliable scientific references. |
| Agent 6 — Integration and QA | Review the integrated application, fix bugs, test functionality, and update documentation. |

### Available Coding Agents

Inspect and use the following local coding tools where available:

- **Codex** — OpenAI.
- **EntryGPT / Google coding agent** — verify the actual installed tool and identity.
- **OpenCode** — use it as another coding agent.
- **Qoder AI / Codar** — use it if installed and available.
- **Claude Code** — use it if available.

Agents should have clearly separated responsibilities. Avoid allowing multiple agents to modify the same files simultaneously. Use separate branches, worktrees, or other isolated execution methods when possible.

Do not simply launch agents and assume their work is correct. Review their outputs, test their changes, and integrate only verified work.

If a particular agent is unavailable, continue using the remaining agents rather than blocking the project.

## 4. Dataset Research and Scientific Data Selection

Use only:

1. Official NASA datasets and resources.
2. Datasets provided by the partners explicitly identified on the official NASA challenge website.

Do not introduce unrelated third-party datasets just because they appear useful.

For every candidate dataset, investigate:

- Official dataset name and provider.
- Original source URL.
- Geographic and temporal coverage.
- Relevant variables and measurements.
- Data format and availability.
- Whether it is suitable for our specific problem.

Select datasets based on actual relevance to the challenge and the available model inputs.

**Important website requirement:** The website's Data Sources section must mention only the datasets that were actually downloaded, processed, and used in our final machine learning model.

Do not list datasets that were merely considered, researched, or potentially useful.

Maintain a small dataset provenance record containing the original source, variables used, preprocessing performed, and the part of the model that uses the data.

## 5. Machine Learning Development and Kaggle Training

Develop and train the machine learning model using Kaggle, accessing my account through the Kaggle CLI.

Follow this workflow:

1. Download the selected official datasets.
2. Inspect their structures, coverage, missing values, and quality.
3. Clean and preprocess the data.
4. Integrate the relevant datasets into a consistent training dataset.
5. Perform exploratory data analysis.
6. Identify useful features and relationships.
7. Select suitable baseline and advanced machine learning models.
8. Train the models.
9. Compare their performance.
10. Select the most suitable model based on validation results.
11. Export the final model to ONNX.
12. Integrate ONNX Runtime into the website so predictions can run in the browser.

Use an appropriate validation strategy for the dataset. Avoid data leakage, especially when observations are related by location, year, season, or time.

Evaluate the model using suitable metrics such as accuracy, precision, recall, F1-score, ROC-AUC, MAE, or RMSE, depending on the actual task.

Do not select a model simply because it produces impressive training results. Evaluate its performance on data not used during training.

### ONNX Integration

The final model must:

- Be exported successfully to ONNX.
- Load correctly through ONNX Runtime Web.
- Produce valid predictions in the browser.
- Use the same preprocessing and feature order as the training pipeline.
- Pass an inference comparison against the original model.
- Handle missing or invalid user inputs safely.

Keep the final model, preprocessing requirements, feature definitions, and relevant training artifacts organized in the project.

If Kaggle training or ONNX conversion encounters a limitation, document it and implement the best working alternative without pretending that the requested pipeline succeeded.

## 6. Improve the Application and Existing Website

Inspect the entire existing project before making changes.

Understand the current architecture, features, data flow, model integration, and user journey.

Then update the website according to the official NASA challenge requirements.

Pay particular attention to:

- Incorrect or outdated challenge descriptions.
- UI components that do not work correctly.
- Missing or inaccurate information.
- Inconsistent terminology.
- Broken navigation and interactions.
- Incomplete visualizations.
- Poor presentation of recommendations.
- Incorrect or misleading dataset descriptions.
- Mobile responsiveness and overall usability.

Improve the visual design where necessary, but preserve working features and the existing architecture unless a change is genuinely required.

The website should clearly communicate the problem, methodology, data sources, model outputs, scientific reasoning, and practical value for farmers.

## 7. Fix the Crop Rotation / Planting Sequence System

There appears to be a bug in the existing crop rotation or planting-sequence system.

Inspect the implementation carefully and identify the actual cause of the problem.

Check:

- The rotation calculation logic.
- The order of recommended crops or rice varieties.
- Season and planting-period constraints.
- Compatibility between consecutive crops.
- Input and output validation.
- Data dependencies and state management.
- Frontend display versus backend/model results.

Fix the underlying issue instead of applying a temporary UI workaround.

Also review the entire planting recommendation workflow and update its analysis methodology to match the latest NASA challenge description.

Test different input scenarios to ensure the system produces consistent and valid results.

## 8. Scientific Validation of Farmer Recommendations

This is a particularly important requirement from my mentor.

The application must not simply tell farmers what to plant. It must explain **why a particular planting sequence or rice variety is recommended**.

For every important recommendation, provide two distinct forms of validation:

### A. Machine Learning Evidence

Explain what the model predicts and why the recommendation is relevant to the available input data.

Where appropriate, show:

- Important influencing features.
- Relevant climate or environmental conditions.
- Model confidence or prediction uncertainty.
- Supporting model metrics.
- Relevant comparisons between available alternatives.

Do not present model predictions as scientific proof or causal explanations.

### B. Independent Scientific and Agricultural Evidence

Find reliable supporting references from official scientific or agricultural sources.

Prioritize:

- NASA publications and documentation.
- Government agricultural research organizations.
- Agricultural universities and research institutes.
- Peer-reviewed scientific papers.
- Official agronomic research and guidelines.

For example, when recommending that a farmer plant one rice variety before another, explain the scientific or agricultural reason behind the sequence.

References should support the actual recommendation, not merely discuss agriculture in general.

For each recommendation, display:

1. The recommended crop or rice variety.
2. Its recommended planting period or sequence.
3. The model-based reasoning.
4. The independent scientific or agricultural reasoning.
5. The supporting reference, including its title, organization or authors, publication date where available, and source link.

Never invent scientific references, researcher names, findings, or citations.

Clearly distinguish between a model-generated prediction and a recommendation supported by established agricultural evidence. Where evidence is insufficient, communicate that uncertainty rather than presenting an unsupported recommendation as fact.

## 9. Update the Methodology and Analysis

Review the methodology currently implemented in the application.

Compare it against the latest official NASA challenge summary.

Update the methodology where necessary, including:

- Problem formulation.
- Data acquisition and integration.
- Feature engineering.
- Environmental and agricultural analysis.
- Model selection.
- Training and evaluation.
- Crop rotation or planting-sequence recommendations.
- Scientific validation.
- Farmer-facing explanations.

Ensure the methodology described on the website reflects what we have genuinely implemented.

Do not claim that an experiment, analysis, or model has been completed unless it has actually been performed.

## 10. Update the README

Update the project's README to explain the actual solution, its architecture, datasets, methodology, machine learning model, and setup instructions.

Include an **AI Tools and Development Assistance** section.

The tools I want acknowledged are:

- Qoder / Codar AI.
- Codex, developed by OpenAI.
- Claude Code, developed by Anthropic.
- Muse Code, attributed to Meta.
- Google EntryGPT.
- OpenCode.
- Tars, attributed to SpaceX.

Verify the exact product names and company attributions before publishing them. Do not invent or falsely attribute a tool to a company. Preserve the intended acknowledgements and clearly flag anything that cannot be verified.

Also include an **AI-Generated Media and Audio** section mentioning the tools used in creating our presentation video:

- ElevenLabs audio.
- Google audio generation.
- D0 / the synthetic video generation tool used in the project.

Verify the exact tool name for D0 rather than silently replacing it with another product.

Only describe tools as actually used when their use is confirmed. Keep the README transparent about AI-assisted development and generated media.

## 11. Final Testing and Quality Assurance

After all agents finish, perform a complete integration review.

Check the following:

- The website builds and runs successfully.
- The main user journey works.
- All relevant UI components function correctly.
- NASA challenge information is accurate.
- The methodology matches the official challenge.
- Only genuinely used datasets appear in the Data Sources section.
- The crop rotation system works correctly.
- Recommendations have scientific supporting references.
- The trained ONNX model loads in the browser.
- Model predictions match the expected inference behavior.
- The README is updated.
- No broken links, missing assets, or obvious runtime errors remain.

Fix issues discovered during testing whenever possible.

Keep a record of unresolved problems and do not hide incomplete functionality.

## 12. Security and Execution Rules

- Never expose, upload, email, or transmit secrets from local environment files or configuration files.
- Never disclose API keys, tokens, passwords, credentials, or private environment variables to coding agents, GitHub, or other third parties unless explicitly and safely required.
- Do not overwrite working source code or delete project data without a clear technical reason.
- Preserve existing functionality.
- Do not fabricate datasets, model results, scientific evidence, or completed tasks.
- Do not spend excessive time on optional features when core submission requirements remain incomplete.

## 13. Execution Priorities and Final Deliverables

Work in the following priority order:

**Priority 1 — Understand and align:** Analyze NASA's official challenge and identify the required solution.

**Priority 2 — Core functionality:** Fix the planting/rotation bug, correct the methodology, and improve the most important website components.

**Priority 3 — Machine learning:** Acquire the selected data, train and validate the model on Kaggle, export it to ONNX, and integrate it into the website.

**Priority 4 — Scientific validation:** Add reliable scientific explanations and references for farmer recommendations.

**Priority 5 — Presentation and documentation:** Improve the UI, update the Data Sources section, and complete the README.

**Priority 6 — Final verification:** Build, run, test, and inspect the complete application.

Manage time carefully. Do not allow optional improvements or endless experimentation to prevent completion of the core deliverables before the NASA submission deadline.

### Final Report

When finished, provide me with a clear report containing:

1. What the NASA challenge actually requires.
2. What changes were made to the website.
3. Which bugs were found and fixed.
4. Which datasets were actually used.
5. Which machine learning models were trained and their validation results.
6. Whether ONNX export and browser inference work.
7. Which recommendations have independent scientific support.
8. What was updated in the README.
9. Which tests passed.
10. Any remaining limitations or incomplete tasks.

**Final instruction:** Take ownership of the entire workflow. Work as the lead engineer coordinating all available agents and tools. Analyze before modifying, validate before presenting results, and keep the implementation aligned with NASA's official challenge requirements. The goal is a functional, scientifically defensible, well-presented, and submission-ready project—not merely a website that looks complete.
