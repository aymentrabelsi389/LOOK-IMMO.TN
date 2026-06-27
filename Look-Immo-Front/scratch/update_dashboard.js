const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'LOOK IMMO', 'Desktop', 'Site Fares ing', 'Look-Immo-Front', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  /import { Property, User, Appointment, SiteSettings, Contract, OrganicVisit } from '\.\.\/types';\r?\nimport Price from '\.\.\/components\/Price';\r?\nimport { visitsAPI } from '\.\.\/services\/api';/,
  `import { Property, User, Appointment, SiteSettings, Contract, ClientDemand } from '../types';
import Price from '../components/Price';
import { clientDemandsAPI, appointmentsAPI } from '../services/api';`
);

content = content.replace(
  /Search, Trash2, Edit, ChevronRight, Phone, Home as HomeIcon/,
  `Search, Trash2, Edit, ChevronRight, Phone, Home as HomeIcon, CheckCircle, Target, Activity, Check, Filter`
);

// 2. States and Effects
const stateStartStr = `// State for organic visits`;
const stateEndStr = `  // Pagination for filtered visits\r?\n  const totalFilteredPages = Math\\.ceil\\(filteredVisits\\.length \/ visitsPerPage\\);\r?\n  const filteredVisitsToShow = filteredVisits\\.slice\\(\\(visitsPage - 1\\) \\* visitsPerPage, visitsPage \\* visitsPerPage\\);`;

const newStates = `
  // Client Demands State
  const [clientDemands, setClientDemands] = useState<ClientDemand[]>([]);
  const [isLoadingDemands, setIsLoadingDemands] = useState(false);
  const [demandForm, setDemandForm] = useState<Partial<ClientDemand>>({
    clientName: '', phone: '', description: '', location: '', type: 'appartement', budget: 0, priority: 'medium', status: 'searching'
  });
  const [showDemandModal, setShowDemandModal] = useState(false);

  // Appointments State
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptForm, setAptForm] = useState<Partial<Appointment>>({
    clientName: '', userPhone: '', source: 'website', meetingType: 'visite', date: '', time: '', message: '', propertyId: ''
  });

  // Fetch Demands
  useEffect(() => {
    if (user.role === 'admin' || user.role === 'agent') {
      const fetchDemands = async () => {
        setIsLoadingDemands(true);
        try {
          const data = await clientDemandsAPI.getAll();
          setClientDemands(data);
        } catch (err) {
          console.error("Failed to fetch demands:", err);
        } finally {
          setIsLoadingDemands(false);
        }
      };
      fetchDemands();
    }
  }, [user.role]);

  const handleAddDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newDemand = await clientDemandsAPI.create(demandForm);
      setClientDemands(prev => [newDemand, ...prev]);
      setShowDemandModal(false);
      setDemandForm({ clientName: '', phone: '', description: '', location: '', type: 'appartement', budget: 0, priority: 'medium', status: 'searching' });
    } catch (err) {
      console.error("Failed to add demand:", err);
    }
  };

  const handleUpdateDemandStatus = async (id: string, status: 'searching' | 'contacted' | 'matched' | 'closed') => {
    try {
      const updated = await clientDemandsAPI.update(id, { status });
      setClientDemands(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      console.error("Failed to update demand:", err);
    }
  };

  const handleDeleteDemand = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;
    try {
      await clientDemandsAPI.delete(id);
      setClientDemands(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error("Failed to delete demand:", err);
    }
  };

  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appointmentsAPI.create(aptForm);
      setShowAptModal(false);
      window.location.reload(); // Quick refresh to show new appointment
    } catch(err) {
      console.error(err);
    }
  };

  const handleUpdateAptStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled') => {
    try {
      await appointmentsAPI.update(id, { status });
      onUpdateAppointment(id, { status });
    } catch(err) {
      console.error(err);
    }
  };

  // Stats Logic
  const today = new Date().toDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toDateString();

  const apptsToday = appointments.filter(a => new Date(a.date).toDateString() === today && a.status !== 'cancelled').length;
  const apptsTomorrow = appointments.filter(a => new Date(a.date).toDateString() === tomorrow && a.status !== 'cancelled').length;
  const activeDemands = clientDemands.filter(d => d.status === 'searching' || d.status === 'contacted').length;
  const matchedDemandsCount = clientDemands.filter(d => d.status === 'matched').length;

  const [filterAptStatus, setFilterAptStatus] = useState<string>('all');
  const [filterDemandStatus, setFilterDemandStatus] = useState<string>('all');
`;

const stateRegex = new RegExp(`${stateStartStr}[\\s\\S]*?${stateEndStr}`);
content = content.replace(stateRegex, newStates);

// 3. Admin View UI Replacement
const uiStartStr = `\\{\\/\\* LEFT COLUMN: Admin = Organic Visits, User = Favorites \\*\\/\\}`;
const uiEndStr = `\\{\\/\\* RIGHT COLUMN: Compact Appointment Reminder Widget \\*\\/\\}`;

const newUI = \`
      {/* Dashboard Stats */}
      {user.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-4">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Rdv Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{apptsToday}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Rdv Demain</p>
              <p className="text-2xl font-bold text-gray-900">{apptsTomorrow}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mr-4">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Demandes Actives</p>
              <p className="text-2xl font-bold text-gray-900">{activeDemands}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 mr-4">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Demandes Matchées</p>
              <p className="text-2xl font-bold text-gray-900">{matchedDemandsCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Grid: Admin = Appointments + Demands, User = Favorites & Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {user.role === 'admin' ? (
          <div className="lg:col-span-2 space-y-6">
            {/* ADMIN: Calendrier des Rendez-vous Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-brand-dark flex items-center">
                  <CalendarDays className="mr-2 text-brand-teal" size={22} />
                  Calendrier des Rendez-vous
                  <span className="ml-2 px-2 py-0.5 bg-brand-teal/10 text-brand-teal text-xs font-bold rounded-full">
                    {appointments.length}
                  </span>
                </h2>
                <div className="flex gap-2">
                  <select 
                    value={filterAptStatus}
                    onChange={(e) => setFilterAptStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:border-brand-teal"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                  <button 
                    onClick={() => setShowAptModal(true)}
                    className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-dark transition-colors flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Nouveau
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Client</th>
                      <th className="px-4 py-3">Date & Heure</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Propriété</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {appointments
                      .filter(a => filterAptStatus === 'all' ? true : a.status === filterAptStatus)
                      .slice(0, 10).map(apt => (
                      <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {apt.userName || apt.clientName}
                          <div className="text-xs text-gray-500 font-normal">{apt.userPhone || apt.clientPhone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-800">{new Date(apt.date).toLocaleDateString('fr-FR')}</span>
                          <div className="text-xs text-gray-500">{apt.time}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                            {apt.meetingType || 'Visite'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{apt.propertyTitle}</td>
                        <td className="px-4 py-3">
                          <select 
                            value={apt.status} 
                            onChange={(e) => handleUpdateAptStatus(apt.id, e.target.value as any)}
                            className={\`text-xs font-bold rounded-full px-2.5 py-1 border-0 focus:ring-2 \${
                              apt.status === 'confirmed' ? 'bg-green-100 text-green-700 focus:ring-green-500' :
                              apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700 focus:ring-yellow-500' :
                              'bg-red-100 text-red-700 focus:ring-red-500'
                            }\`}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEditAppointment(apt)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-500">Aucun rendez-vous trouvé</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ADMIN: Demandes Clients Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-brand-dark flex items-center">
                  <Target className="mr-2 text-orange-500" size={22} />
                  Demandes Clients
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                    {clientDemands.length}
                  </span>
                </h2>
                <div className="flex gap-2">
                  <select 
                    value={filterDemandStatus}
                    onChange={(e) => setFilterDemandStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:border-orange-400"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="searching">En recherche</option>
                    <option value="contacted">Contacté</option>
                    <option value="matched">Matché</option>
                    <option value="closed">Fermé</option>
                  </select>
                  <button 
                    onClick={() => setShowDemandModal(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Nouvelle Demande
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {clientDemands
                  .filter(d => filterDemandStatus === 'all' ? true : d.status === filterDemandStatus)
                  .map(demand => (
                  <div key={demand.id} className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{demand.clientName}</h4>
                        <span className="text-xs font-medium text-gray-500">{demand.phone}</span>
                        {demand.priority === 'high' && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase tracking-wider">Urgent</span>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{demand.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        <span className="flex items-center bg-white border border-gray-200 px-2.5 py-1 rounded-md text-gray-700">
                          <MapPin size={12} className="mr-1 text-gray-400" /> {demand.location}
                        </span>
                        <span className="flex items-center bg-white border border-gray-200 px-2.5 py-1 rounded-md text-gray-700 capitalize">
                          {demand.type}
                        </span>
                        {demand.budget && (
                          <span className="flex items-center bg-white border border-gray-200 px-2.5 py-1 rounded-md text-green-700">
                            Budget: {demand.budget.toLocaleString()} DT
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row md:flex-col items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
                      <select 
                        value={demand.status}
                        onChange={(e) => handleUpdateDemandStatus(demand.id, e.target.value as any)}
                        className={\`text-xs font-bold rounded-lg px-3 py-1.5 border-0 focus:ring-2 w-full md:w-32 \${
                          demand.status === 'matched' ? 'bg-green-100 text-green-700 focus:ring-green-500' :
                          demand.status === 'searching' ? 'bg-orange-100 text-orange-700 focus:ring-orange-500' :
                          demand.status === 'contacted' ? 'bg-blue-100 text-blue-700 focus:ring-blue-500' :
                          'bg-gray-200 text-gray-700 focus:ring-gray-500'
                        }\`}
                      >
                        <option value="searching">En recherche</option>
                        <option value="contacted">Contacté</option>
                        <option value="matched">Matché</option>
                        <option value="closed">Fermé</option>
                      </select>
                      <button onClick={() => handleDeleteDemand(demand.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {clientDemands.length === 0 && (
                  <div className="text-center py-6 text-gray-500">Aucune demande client enregistrée</div>
                )}
              </div>
            </div>
            
            {/* Working Hours Management */}
            {settings && onUpdateSettings && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <Clock size={18} className="mr-2 text-brand-teal" />
                    Horaires d'ouverture
                  </h3>
                  {!isEditingHours ? (
                    <button
                      onClick={() => setIsEditingHours(true)}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      Modifier
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditingHours(false)}
                        className="text-xs text-gray-500 font-semibold hover:underline"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingHours ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="block text-xs text-gray-500 uppercase">Lun-Ven</span>
                      <span className="font-medium text-gray-900">{settings.workingHours?.weekdays}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="block text-xs text-gray-500 uppercase">Samedi</span>
                      <span className="font-medium text-gray-900">{settings.workingHours?.saturday}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="block text-xs text-gray-500 uppercase">Dimanche</span>
                      <span className={\`font-medium \${settings.workingHours?.sunday === 'Fermé' ? 'text-red-500' : 'text-gray-900'}\`}>{settings.workingHours?.sunday}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateHours} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Lun-Ven</label>
                        <input
                          type="text"
                          value={hoursForm.weekdays}
                          onChange={e => setHoursForm({ ...hoursForm, weekdays: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-brand-teal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Samedi</label>
                        <input
                          type="text"
                          value={hoursForm.saturday}
                          onChange={e => setHoursForm({ ...hoursForm, saturday: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-brand-teal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Dimanche</label>
                        <input
                          type="text"
                          value={hoursForm.sunday}
                          onChange={e => setHoursForm({ ...hoursForm, sunday: e.target.value })}
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-brand-teal"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-brand-teal text-white text-sm font-semibold rounded hover:bg-brand-dark transition"
                    >
                      Enregistrer les horaires
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
\`;

const uiRegex = new RegExp(\`\\{\\/\\* LEFT COLUMN: Admin = Organic Visits, User = Favorites \\*\\/\\}[\\\\s\\\\S]*?\\{\\/\\* RIGHT COLUMN: Compact Appointment Reminder Widget \\*\\/\\}\`);
content = content.replace(uiRegex, newUI + '\\n        {/* RIGHT COLUMN: Compact Appointment Reminder Widget */}');


// 4. Modals Replacement
const modalStartStr = \`\\{\\/\\* Visits Modal - Redesigned \\*\\/\\}\`;
const modalEndStr = \`\\{\\/\\* Edit Appointment Modal \\*\\/\\}\`;

const newModals = \`
      {/* Add Appointment Modal */}
      {showAptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowAptModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <CalendarDays className="mr-2 text-brand-teal" size={20} />
                Nouveau Rendez-vous
              </h3>
              <button onClick={() => setShowAptModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddApt} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nom Client *</label>
                  <input required type="text" value={aptForm.clientName} onChange={e => setAptForm({...aptForm, clientName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                  <input type="text" value={aptForm.userPhone} onChange={e => setAptForm({...aptForm, userPhone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date *</label>
                  <input required type="date" value={aptForm.date} onChange={e => setAptForm({...aptForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Heure *</label>
                  <input required type="time" value={aptForm.time} onChange={e => setAptForm({...aptForm, time: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type *</label>
                  <select value={aptForm.meetingType} onChange={e => setAptForm({...aptForm, meetingType: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal">
                    <option value="visite">Visite</option>
                    <option value="appel">Appel</option>
                    <option value="reunion">Réunion agence</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Source</label>
                  <select value={aptForm.source} onChange={e => setAptForm({...aptForm, source: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal">
                    <option value="website">Site web</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Propriété Associée</label>
                <select value={aptForm.propertyId} onChange={e => setAptForm({...aptForm, propertyId: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal">
                  <option value="">Aucune</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                <textarea value={aptForm.message} onChange={e => setAptForm({...aptForm, message: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAptModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-teal text-white font-bold rounded-xl hover:bg-brand-dark transition shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Demand Modal */}
      {showDemandModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowDemandModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Target className="mr-2 text-orange-500" size={20} />
                Nouvelle Demande Client
              </h3>
              <button onClick={() => setShowDemandModal(false)} className="p-2 hover:bg-orange-200 rounded-full transition text-gray-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddDemand} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nom Client *</label>
                  <input required type="text" value={demandForm.clientName} onChange={e => setDemandForm({...demandForm, clientName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Téléphone</label>
                  <input type="text" value={demandForm.phone} onChange={e => setDemandForm({...demandForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description / Recherche *</label>
                <textarea required value={demandForm.description} onChange={e => setDemandForm({...demandForm, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" placeholder="Ex: Cherche villa avec piscine..."></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Localisation *</label>
                  <input required type="text" value={demandForm.location} onChange={e => setDemandForm({...demandForm, location: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Type de bien *</label>
                  <select required value={demandForm.type} onChange={e => setDemandForm({...demandForm, type: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                    <option value="appartement">Appartement</option>
                    <option value="villa">Villa</option>
                    <option value="terrain">Terrain</option>
                    <option value="bureau">Bureau</option>
                    <option value="commerce">Commerce</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Budget Max (DT)</label>
                  <input type="number" value={demandForm.budget || ''} onChange={e => setDemandForm({...demandForm, budget: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Priorité</label>
                  <select value={demandForm.priority} onChange={e => setDemandForm({...demandForm, priority: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                    <option value="high">Haute</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowDemandModal(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Annuler</button>
                <button type="submit" className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
`;

const modalRegex = new RegExp(\`\\{\\/\\* Visits Modal - Redesigned \\*\\/\\}[\\\\s\\\\S]*?\\{\\/\\* Edit Appointment Modal \\*\\/\\}\`);
content = content.replace(modalRegex, newModals);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DashboardPage updated successfully');
