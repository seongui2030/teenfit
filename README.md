
  # 청소년 건강 관리 시스템

  This is a code bundle for 청소년 건강 관리 시스템. The original project is available at https://www.figma.com/design/QsnaJSuDePwkUX2L0w6HkV/%ED%95%99%EC%83%9D-%EA%B1%B4%EA%B0%95-%EA%B4%80%EB%A6%AC-%EC%8B%9C%EC%8A%A4%ED%85%9C.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Vercel deployment

  This project can be deployed to Vercel as a Vite app.

  - Build command: `pnpm build`
  - Output directory: `dist`

  ## Allergy notification with GitHub Actions

  The allergy notification script runs separately from the Vercel frontend.

  - Workflow file: `.github/workflows/allergy-notification.yml`
  - Manual run: GitHub Actions `workflow_dispatch`
  - Scheduled run: daily at `07:00 KST` via cron `0 22 * * *` in UTC

  Configure these GitHub repository secrets before enabling the workflow.

  - `NEIS_API_KEY`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `ATPT_OFCDC_SC_CODE` optional
  - `SD_SCHUL_CODE` optional
  
