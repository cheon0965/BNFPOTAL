// ============================================================================
// 파일명: ApplicationDbContext.cs
// 경로: Backend/Data/ApplicationDbContext.cs
// 설명: Entity Framework Core DbContext - 데이터베이스 연결 및 모델 구성
// ----------------------------------------------------------------------------
// [DbSet 목록]
// - Companies, Users, RegistrationCodes, ErpSystems, Requests, RequestComments, Attachments 등
//   - Notifications: 알림
//   - Notices, NoticeAttachments, NoticeViews: 공지사항
//   - EmailTemplates, EmailSettings: 이메일 템플릿/설정
//   - RefreshTokens: JWT 리프레시 토큰
//
// [관계 설정]
//   - OnModelCreating(): 인덱스, FK 제약, 삭제 동작 정의
// - DeleteBehavior.Restrict: 참조된 데이터 삭제 방지
// - DeleteBehavior.Cascade: 부모 삭제 시 자식 자동 삭제
//
// [유지보수 가이드]
//   - 신규 엔티티 추가: DbSet 추가 후 OnModelCreating에 관계 설정
//   - 초기 데이터는 SQL 스크립트(database/*.sql) 기준으로 관리
// ============================================================================

using Microsoft.EntityFrameworkCore;
using BnfErpPortal.Models;

namespace BnfErpPortal.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }
    
    public DbSet<Company> Companies { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<RegistrationCode> RegistrationCodes { get; set; }
    public DbSet<ErpSystem> ErpSystems { get; set; }
    public DbSet<Request> Requests { get; set; }
    public DbSet<RequestComment> RequestComments { get; set; }
    public DbSet<Attachment> Attachments { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<Notice> Notices { get; set; }
    public DbSet<NoticeAttachment> NoticeAttachments { get; set; }
    public DbSet<NoticeView> NoticeViews { get; set; }
    public DbSet<EmailTemplate> EmailTemplates { get; set; }
    public DbSet<EmailSettings> EmailSettings { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<InternalTask> InternalTasks { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<TaskAttachment> TaskAttachments { get; set; }
    public DbSet<TaskReference> TaskReferences { get; set; }

    // OnModelCreating 메서드
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Company
        modelBuilder.Entity<Company>()
            .HasIndex(c => c.Code)
            .IsUnique();

        modelBuilder.Entity<Notification>()
            .ToTable("Notifications");

        modelBuilder.Entity<EmailTemplate>()
            .ToTable("EmailTemplates");

        modelBuilder.Entity<EmailTemplate>()
            .HasIndex(e => e.TemplateKey)
            .IsUnique();

        modelBuilder.Entity<EmailTemplate>()
            .Property(e => e.IsEnabled)
            .HasDefaultValue(true);

        modelBuilder.Entity<EmailSettings>()
            .ToTable("EmailSettings");
        
        // User
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
        
        modelBuilder.Entity<User>()
            .HasOne(u => u.Company)
            .WithMany(c => c.Users)
            .HasForeignKey(u => u.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // RegistrationCode
        modelBuilder.Entity<RegistrationCode>()
            .HasIndex(r => r.Code)
            .IsUnique();
        
        modelBuilder.Entity<RegistrationCode>()
            .HasOne(r => r.Company)
            .WithMany(c => c.RegistrationCodes)
            .HasForeignKey(r => r.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<RegistrationCode>()
            .HasOne(r => r.CreatedBy)
            .WithMany(u => u.CreatedRegistrationCodes)
            .HasForeignKey(r => r.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // ErpSystem
        modelBuilder.Entity<ErpSystem>()
            .HasOne(e => e.Company)
            .WithMany(c => c.ErpSystems)
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // Request
        modelBuilder.Entity<Request>()
            .HasIndex(r => new { r.CompanyId, r.Status });
        
        modelBuilder.Entity<Request>()
            .HasOne(r => r.Company)
            .WithMany(c => c.Requests)
            .HasForeignKey(r => r.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<Request>()
            .HasOne(r => r.CreatedBy)
            .WithMany(u => u.CreatedRequests)
            .HasForeignKey(r => r.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<Request>()
            .HasOne(r => r.AssignedTo)
            .WithMany(u => u.AssignedRequests)
            .HasForeignKey(r => r.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<Request>()
            .HasOne(r => r.ErpSystem)
            .WithMany(e => e.Requests)
            .HasForeignKey(r => r.ErpSystemId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // RequestComment
        modelBuilder.Entity<RequestComment>()
            .HasOne(c => c.Request)
            .WithMany(r => r.Comments)
            .HasForeignKey(c => c.RequestId)
            .OnDelete(DeleteBehavior.Cascade);
        
        modelBuilder.Entity<RequestComment>()
            .HasOne(c => c.User)
            .WithMany(u => u.Comments)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // Attachment
        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.Request)
            .WithMany(r => r.Attachments)
            .HasForeignKey(a => a.RequestId)
            .OnDelete(DeleteBehavior.Cascade);

        // Notification
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.Request)
            .WithMany()
            .HasForeignKey(n => n.RequestId)
            .OnDelete(DeleteBehavior.Cascade);
        
        // Notice
        modelBuilder.Entity<Notice>()
            .HasOne(n => n.CreatedBy)
            .WithMany()
            .HasForeignKey(n => n.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<Notice>()
            .HasIndex(n => n.CreatedAt);
        
        // NoticeAttachment
        modelBuilder.Entity<NoticeAttachment>()
            .HasOne(na => na.Notice)
            .WithMany(n => n.Attachments)
            .HasForeignKey(na => na.NoticeId)
            .OnDelete(DeleteBehavior.Cascade);

        // NoticeView - 공지 조회 로그 (NoticeId + UserId 유니크)
        modelBuilder.Entity<NoticeView>()
            .HasIndex(v => new { v.NoticeId, v.UserId })
            .IsUnique();

        modelBuilder.Entity<NoticeView>()
            .HasOne(v => v.Notice)
            .WithMany()
            .HasForeignKey(v => v.NoticeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NoticeView>()
            .HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // RefreshToken
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique();
        
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.UserId);
        
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.ExpiresAt);
        
        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany()
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // PasswordResetToken
        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => prt.Token)
            .IsUnique();
        
        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(prt => prt.UserId);
        
        modelBuilder.Entity<PasswordResetToken>()
            .HasOne(prt => prt.User)
            .WithMany()
            .HasForeignKey(prt => prt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // AuditLog
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.EntityType, a.EntityId });
            
        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // InternalTask
        modelBuilder.Entity<InternalTask>()
            .HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InternalTask>()
            .HasOne(t => t.AssignedTo)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskReference
        modelBuilder.Entity<TaskReference>()
            .HasIndex(tr => new { tr.TaskId, tr.UserId })
            .IsUnique();

        modelBuilder.Entity<TaskReference>()
            .HasOne(tr => tr.Task)
            .WithMany(t => t.ReferenceUsers)
            .HasForeignKey(tr => tr.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskReference>()
            .HasOne(tr => tr.User)
            .WithMany()
            .HasForeignKey(tr => tr.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskReference>()
            .HasOne(tr => tr.AddedByUser)
            .WithMany()
            .HasForeignKey(tr => tr.AddedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskComment
        modelBuilder.Entity<TaskComment>()
            .HasOne(tc => tc.Task)
            .WithMany(t => t.Comments)
            .HasForeignKey(tc => tc.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskComment>()
            .HasOne(tc => tc.User)
            .WithMany()
            .HasForeignKey(tc => tc.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // TaskAttachment
        modelBuilder.Entity<TaskAttachment>()
            .HasOne(ta => ta.Task)
            .WithMany(t => t.Attachments)
            .HasForeignKey(ta => ta.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TaskAttachment>()
            .HasOne(ta => ta.Comment)
            .WithMany(tc => tc.Attachments)
            .HasForeignKey(ta => ta.TaskCommentId)
            .OnDelete(DeleteBehavior.NoAction);

    }
}
