function PreTestRequiredDialog() {
  return (
    <div className="pretest-required-overlay" aria-hidden="false">
      <section
        className="pretest-required-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pretest-dialog-title"
        aria-describedby="pretest-dialog-description"
      >
        <h2 id="pretest-dialog-title">
          Anda belum Mengerjakan Pre-Test.
        </h2>
        <p id="pretest-dialog-description">
          Kerjakan Pre-Test Untuk membuka Materi!
        </p>
      </section>
    </div>
  );
}

export default PreTestRequiredDialog;
