class ApplicationController < ActionController::API
  include ActionController::Cookies
  before_action :reject_cross_origin_request, except: [:icon]

  @current_user = nil

  private

  def log_in(user)
    cookies[:_badsns_token] = generate_token(user)
  end

  def log_out()
    cookies.delete(:_badsns_token)
  end

  def authenticate_user!
    if token = cookies[:_badsns_token]
      payload = decode_token(token)
      @current_user = User.find_by id: payload[:id]
    end
    render :nothing => true, :status => :forbidden and return if @current_user.nil?
  end

  def generate_token(user)
    payload = {id: user.id, login_id: user.login_id, name: user.name, email: user.email}
    JWT.encode payload, Rails.application.secrets.secret_key_base, 'HS256'
  end

  def decode_token(token)
    payload, header = JWT.decode(token, Rails.application.secrets.secret_key_base, true, { algorithm: 'HS256'})
    payload.with_indifferent_access
  end

  def reject_non_admin_user
    render :nothing => true, :status => :forbidden and return unless @current_user.admin?
  end

  def reject_cross_origin_request
    render :nothing => true, :status => :bad_request and return unless request.headers['X-Requested-With']
  end
end
