import React from "react";
import dayjs from "dayjs";

const styles = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#222",
  },
  mainHeading: {
    textAlign: "center",
    color: "#1a73e8",
    fontWeight: "600",
    marginBottom: "2.5rem",
  },
  sectionHeading: {
    fontWeight: "bold",
    fontSize: 22,
    borderBottom: "2px solid #ddd",
    paddingBottom: 8,
    marginBottom: 20,
    marginTop: "2.5rem",
    display: "flex", // FIX: Added for badge alignment
    justifyContent: "space-between", // FIX: Added for badge alignment
    alignItems: "center", // FIX: Added for badge alignment
  },
  subHeading: {
    fontWeight: 600,
    fontSize: 18,
    marginBottom: 12,
    marginTop: 24,
    color: "#333",
  },
  line: { marginBottom: 10, lineHeight: 1.6 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0 2rem",
  },
  link: {
    color: "#1a73e8",
    textDecoration: "none",
    fontWeight: 500,
  },
  tag: {
    display: "inline-block",
    backgroundColor: "#e0e0e0",
    color: "#333",
    padding: "6px 12px",
    borderRadius: "16px",
    margin: "0 8px 8px 0",
    fontSize: "14px",
  },
  pre: {
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    marginLeft: "1rem",
    color: "#555",
  },
  statusBadge: {
    fontSize: "14px",
    fontWeight: "600",
    padding: "4px 10px",
    borderRadius: "12px",
    color: "#fff",
  },
  statusApproved: { backgroundColor: "#2e7d32" },
  statusPending: { backgroundColor: "#ed6c02" },
  statusPlaceholder: {
    // FIX: Added style for placeholder
    padding: "2rem",
    textAlign: "center",
    color: "#888",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    border: "1px dashed #ccc",
  },
};

// FIX: DEFINED THE MISSING HELPER FUNCTION
const valueOrNA = (val) => (val ? String(val).trim() : "Not Provided");

const formatDate = (dateStr) =>
  dateStr ? dayjs(dateStr).format("DD MMMM, YYYY") : "Not Provided";

const maskSensitiveNumber = (num) => {
  if (!num) return "Not Provided";
  const strNum = String(num);
  return strNum.length > 4 ? `••••••••${strNum.slice(-4)}` : strNum;
};

const DisplayField = ({ label, value }) => (
  <p style={styles.line}>
    <b>{label}:</b> {valueOrNA(value)}
  </p>
);

const DisplayFileLink = ({ label, url }) =>
  url ? (
    <p style={styles.line}>
      <b>{label}:</b>{" "}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.link}
      >
        View Document
      </a>
    </p>
  ) : (
    <DisplayField label={label} value={null} />
  );

export default function ApplicationDisplay({ applicationData: appData }) {
  if (!appData) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        No application data provided.
      </div>
    );
  }

  const {
    applicationId,
    personalDetails = {},
    currentAddress = {},
    permanentAddress = {},
    education = [],
    workExperience = [],
    skills = [],
    projects = [],
    achievements = [],
    confidentialData = {},
    status,
  } = appData;

  const isStage1Done = true; // If we can view the page, Stage 1 is always done.
  const isStage2Started = Object.keys(confidentialData).length > 0;
  const isStage2Done = [
    "STG2_APPROVED",
    "HR_REVIEW_STG3",
    "COMPLETED",
  ].includes(status);
  const isStage3Done = status === "COMPLETED";

  const formatAddress = (addr) => {
    if (!addr || !addr.addressLine) return "Not Provided";
    return `${addr.addressLine}, ${addr.city}, ${addr.state} - ${addr.pincode}, ${addr.country}`;
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.mainHeading}>
        Application Summary (ID: {applicationId})
      </h1>

      {/* ================================================================= */}
      {/* === FIX: ALL STAGE 1 CONTENT IS NOW GROUPED IN THIS ONE SECTION === */}
      {/* ================================================================= */}
      <section>
        <div style={styles.sectionHeading}>
          Stage 1: Profile & Professional Details
          <span style={{ ...styles.statusBadge, ...styles.statusApproved }}>
            Completed
          </span>
        </div>

        {/* --- Personal Information --- */}
        <h3 style={styles.subHeading}>Personal Information</h3>
        <div style={styles.grid}>
          <DisplayField label="First Name" value={personalDetails.firstName} />
          <DisplayField label="Last Name" value={personalDetails.lastName} />
          <DisplayField label="Email" value={personalDetails.personalEmail} />
          <DisplayField
            label="Phone Number"
            value={personalDetails.phoneNumber}
          />
          <DisplayField
            label="Date of Birth"
            value={formatDate(personalDetails.dateOfBirth)}
          />
          <DisplayField label="Gender" value={personalDetails.gender} />
          <DisplayField
            label="Marital Status"
            value={personalDetails.maritalStatus}
          />
          <DisplayField
            label="Blood Group"
            value={personalDetails.bloodGroup}
          />
          <DisplayField
            label="Nationality"
            value={personalDetails.nationality}
          />
          <DisplayField
            label="Emergency Contact"
            value={personalDetails.emergencyContact}
          />
        </div>
        <div style={{ ...styles.grid, marginTop: "1rem" }}>
          <p style={styles.line}>
            <b>LinkedIn Profile:</b>{" "}
            <a href={personalDetails.linkedinProfile} style={styles.link}>
              {valueOrNA(personalDetails.linkedinProfile)}
            </a>
          </p>
          <p style={styles.line}>
            <b>GitHub Profile:</b>{" "}
            <a href={personalDetails.githubProfile} style={styles.link}>
              {valueOrNA(personalDetails.githubProfile)}
            </a>
          </p>
        </div>

        {/* --- Address --- */}
        <h3 style={styles.subHeading}>Address Details</h3>
        <p style={styles.line}>
          <b>Current Address:</b> {formatAddress(currentAddress)}
        </p>
        <p style={styles.line}>
          <b>Permanent Address:</b> {formatAddress(permanentAddress)}
        </p>

        {/* --- Resume --- */}
        <h3 style={styles.subHeading}>Resume</h3>
        <DisplayFileLink label="Applicant's Resume" url={appData.resume?.url} />

        {/* --- Education --- */}
        <h3 style={styles.subHeading}>Education</h3>
        {education.length > 0 ? (
          education.map((edu, index) => (
            <div
              key={index}
              style={{
                marginBottom: 24,
                paddingLeft: "1rem",
                borderLeft: "3px solid #eee",
              }}
            >
              <div style={styles.subHeading}>
                {valueOrNA(edu.educationLevel)}
              </div>
              {(edu.educationLevel === "TENTH" ||
                edu.educationLevel === "TWELFTH") && (
                <>
                  <DisplayField label="Institution" value={edu.schoolName} />
                  <DisplayField label="Board" value={edu.board} />
                  <DisplayField
                    label="Year of Passing"
                    value={edu.yearOfPassing}
                  />
                  <DisplayField label="Grade" value={edu.grade} />
                  <DisplayFileLink
                    label="Certificate"
                    url={edu.certificate?.url}
                  />
                </>
              )}
              {edu.educationLevel !== "TENTH" &&
                edu.educationLevel !== "TWELFTH" && (
                  <>
                    <DisplayField label="Degree" value={edu.degree} />
                    <DisplayField
                      label="Specialization"
                      value={edu.specialization}
                    />
                    <DisplayField label="Institution" value={edu.university} />
                    <DisplayField label="Status" value={edu.status} />
                    <p style={styles.line}>
                      <b>Duration:</b> {formatDate(edu.startDate)} -{" "}
                      {edu.status === "PURSUING"
                        ? "Pursuing"
                        : formatDate(edu.endDate)}
                    </p>
                    <DisplayField
                      label={
                        edu.status === "PURSUING"
                          ? "Latest Grade"
                          : "Final Grade"
                      }
                      value={edu.grade || edu.latestGrade}
                    />
                    <DisplayFileLink
                      label="Certificate"
                      url={edu.certificate?.url}
                    />
                    <DisplayFileLink
                      label="Marksheet"
                      url={edu.marksheet?.url}
                    />
                  </>
                )}
            </div>
          ))
        ) : (
          <p>No education details provided.</p>
        )}

        {/* --- Work Experience --- */}
        <h3 style={styles.subHeading}>Work Experience</h3>
        {workExperience.length > 0 ? (
          workExperience.map((exp, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 20,
                padding: "1rem",
                backgroundColor: "#f9f9f9",
                borderRadius: 8,
              }}
            >
              <p style={styles.line}>
                <b>{exp.jobTitle}</b> at <b>{exp.companyName}</b> (
                {exp.companyLocation})
              </p>
              <p style={styles.line}>
                <b>Duration:</b> {formatDate(exp.startDate)} -{" "}
                {exp.currentlyWorkHere ? "Present" : formatDate(exp.endDate)}
              </p>
              <p style={styles.line}>
                <b>Responsibilities:</b>
              </p>
              <pre style={styles.pre}>{valueOrNA(exp.responsibilities)}</pre>
              <DisplayFileLink
                label="Experience Letter"
                url={exp.experienceLetterUrl}
              />
              <DisplayFileLink
                label="Relieving Letter"
                url={exp.relievingLetterUrl}
              />
              <DisplayFileLink label="Salary Slips" url={exp.salarySlipsUrl} />
            </div>
          ))
        ) : (
          <p>No professional experience provided.</p>
        )}

        {/* --- Projects --- */}
        <h3 style={styles.subHeading}>Projects</h3>
        {projects.length > 0 ? (
          projects.map((proj, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 20,
                paddingLeft: "1rem",
                borderLeft: "3px solid #eee",
              }}
            >
              <p style={styles.line}>
                <b>{proj.projectTitle}</b>
              </p>
              {proj.techStack && (
                <p style={styles.line}>
                  <i>Tech Stack:</i> {valueOrNA(proj.techStack)}
                </p>
              )}
              <p style={{ whiteSpace: "pre-wrap" }}>
                {valueOrNA(proj.projectDescription)}
              </p>
            </div>
          ))
        ) : (
          <p>No projects provided.</p>
        )}

        {/* --- Skills --- */}
        <h3 style={styles.subHeading}>Skills</h3>
        {skills.length > 0 ? (
          <div>
            {" "}
            {skills.map((skill, index) => (
              <span key={index} style={styles.tag}>
                {" "}
                {skill.skillName} ({skill.proficiency}){" "}
              </span>
            ))}{" "}
          </div>
        ) : (
          <p>No skills provided.</p>
        )}
      </section>

      {/* --- STAGE 2: CONFIDENTIAL DATA --- */}
      <section>
        <div style={styles.sectionHeading}>
          Stage 2: Confidential & Statutory Details
          {isStage1Done && (
            <span
              style={{
                ...styles.statusBadge,
                ...(isStage2Done
                  ? styles.statusApproved
                  : styles.statusPending),
              }}
            >
              {isStage2Done ? "Completed" : "In Progress"}
            </span>
          )}
        </div>

        {/* FIX: Improved conditional logic */}
        {isStage2Started ? (
          <div>
            <h3 style={styles.subHeading}>Bank Account Details</h3>
            <div style={styles.grid}>
              <DisplayField
                label="Bank Name"
                value={confidentialData.bankName}
              />
              <DisplayField
                label="Account Holder"
                value={confidentialData.accountHolderName}
              />
              <DisplayField
                label="Account Number"
                value={maskSensitiveNumber(confidentialData.accountNumber)}
              />
              <DisplayField
                label="IFSC Code"
                value={confidentialData.ifscCode}
              />
            </div>
            <h3 style={styles.subHeading}>Statutory Documents</h3>
            <DisplayFileLink
              label="Signed Offer Letter"
              url={confidentialData.signedOfferLetterUrl}
            />
            <DisplayFileLink
              label="Aadhaar Card"
              url={confidentialData.aadharCardUrl}
            />
            <DisplayFileLink
              label="PAN Card"
              url={confidentialData.panCardUrl}
            />
            <DisplayFileLink
              label="Address Proof"
              url={confidentialData.currentAddressProofUrl}
            />
            <DisplayFileLink
              label="Cancelled Cheque"
              url={confidentialData.cancelledChequeUrl}
            />

            {workExperience.length > 0 && (
              <>
                <h3 style={styles.subHeading}>Prior Experience Documents</h3>
                <DisplayFileLink
                  label="Relieving Letter"
                  url={confidentialData.relievingLetterUrl}
                />
                <DisplayFileLink
                  label="Experience Letter"
                  url={confidentialData.experienceLetterUrl}
                />
                <DisplayFileLink
                  label="Salary Slips"
                  url={confidentialData.salarySlipsUrl}
                />

                <h3 style={styles.subHeading}>Statutory Numbers</h3>
                <div style={styles.grid}>
                  <DisplayField
                    label="UAN Number"
                    value={confidentialData.uanNumber}
                  />
                  <DisplayField
                    label="ESIC Number"
                    value={confidentialData.esicNumber}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={styles.statusPlaceholder}>
            Stage 2 has not been started yet.
          </div>
        )}
      </section>

      {/* --- STAGE 3: ACHIEVEMENTS --- */}
      <section>
        <div style={styles.sectionHeading}>
          Stage 3: Achievements (Optional)
          {isStage2Done && (
            <span
              style={{
                ...styles.statusBadge,
                ...(isStage3Done
                  ? styles.statusApproved
                  : styles.statusPending),
              }}
            >
              {isStage3Done ? "Completed" : "In Progress"}
            </span>
          )}
        </div>

        {/* FIX: Improved conditional logic */}
        {isStage2Done ? (
          achievements.length > 0 ? (
            achievements.map((ach, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 20,
                  padding: "1rem",
                  backgroundColor: "#f9f9f9",
                  borderRadius: 8,
                }}
              >
                <p style={styles.line}>
                  <b>{valueOrNA(ach.title)}</b>
                </p>
                <p style={styles.line}>
                  <i>Issued by:</i> {valueOrNA(ach.issuer)}
                </p>
                <p style={styles.line}>
                  <i>Date:</i> {formatDate(ach.issueDate)}
                </p>
                <DisplayFileLink label="Certificate" url={ach.certificateUrl} />
              </div>
            ))
          ) : (
            <p>No optional achievements were submitted for this stage.</p>
          )
        ) : (
          <div style={styles.statusPlaceholder}>
            Stage 3 is locked until Stage 2 is completed.
          </div>
        )}
      </section>
    </div>
  );
}
