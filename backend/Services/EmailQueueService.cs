// ============================================================================
// 파일명: EmailQueueService.cs
// 경로: Backend/Services/EmailQueueService.cs
// 설명: 비동기 이메일 발송 큐 서비스 - 백그라운드 메일 처리
// ----------------------------------------------------------------------------
// [아키텍처]
//   Controller → IEmailService.SendAsync() → EmailQueueService (큐 추가)
//                                                    ↓
//                EmailSenderBackgroundService (백그라운드 처리) → SmtpEmailSender (실제 발송)
// [유지보수 가이드]
//   - 큐 최대 크기: 1000개 (BoundedChannelOptions)
//   - 발송 실패 시 로그만 남기고 다음 메시지 처리 계속
//   - 재시도 로직 필요 시 EmailSenderBackgroundService 수정
// ============================================================================

using System.Threading.Channels;
using Microsoft.Extensions.Logging;

namespace BnfErpPortal.Services;

/// <summary>
/// 이메일 발송 요청을 담는 모델
/// </summary>
public record EmailMessage(string To, string Subject, string Body);

/// <summary>
/// 이메일 큐에 메시지를 추가하는 인터페이스
/// </summary>
public interface IEmailQueueService
{
    /// <summary>
    /// 이메일을 큐에 추가 (비동기, 즉시 반환)
    /// </summary>
    ValueTask QueueAsync(string to, string subject, string body);
}

/// <summary>
/// Channel 기반 비동기 이메일 큐 서비스
/// </summary>
public class EmailQueueService : IEmailQueueService
{
    private readonly Channel<EmailMessage> _channel;
    private readonly ILogger<EmailQueueService> _logger;

    public EmailQueueService(ILogger<EmailQueueService> logger)
    {
        _logger = logger;
        
        // Bounded channel로 메모리 사용량 제한 (최대 1000개 대기)
        var options = new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        };
        
        _channel = Channel.CreateBounded<EmailMessage>(options);
    }

    public ValueTask QueueAsync(string to, string subject, string body)
    {
        var message = new EmailMessage(to, subject, body);
        
        // TryWrite로 즉시 추가 시도
        if (_channel.Writer.TryWrite(message))
        {
            _logger.LogDebug("이메일 큐에 추가됨: {To}", to);
            return ValueTask.CompletedTask;
        }
        
        // 채널이 가득 찬 경우 비동기로 대기
        return QueueSlowAsync(message);
    }

    private async ValueTask QueueSlowAsync(EmailMessage message)
    {
        await _channel.Writer.WriteAsync(message);
        _logger.LogDebug("이메일 큐에 추가됨 (대기 후): {To}", message.To);
    }

    /// <summary>
    /// 큐에서 메시지를 읽어오는 Reader (백그라운드 서비스용)
    /// </summary>
    public ChannelReader<EmailMessage> Reader => _channel.Reader;
}

/// <summary>
/// 백그라운드에서 이메일 큐를 처리하는 호스티드 서비스
/// </summary>
public class EmailSenderBackgroundService : BackgroundService
{
    private readonly EmailQueueService _queueService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailSenderBackgroundService> _logger;

    public EmailSenderBackgroundService(
        EmailQueueService queueService,
        IServiceScopeFactory scopeFactory,
        ILogger<EmailSenderBackgroundService> logger)
    {
        _queueService = queueService;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("이메일 발송 백그라운드 서비스 시작");

        await foreach (var message in _queueService.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                // Scoped 서비스를 사용하기 위해 새 스코프 생성
                using var scope = _scopeFactory.CreateScope();
                var emailService = scope.ServiceProvider.GetRequiredService<IEmailSender>();
                
                await emailService.SendDirectAsync(message.To, message.Subject, message.Body);
                
                _logger.LogDebug("이메일 발송 완료: {To}", message.To);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "이메일 발송 실패: {To}, 제목: {Subject}", message.To, message.Subject);
                // 실패해도 다음 메시지 처리 계속
            }
        }

        _logger.LogInformation("이메일 발송 백그라운드 서비스 종료");
    }
}
